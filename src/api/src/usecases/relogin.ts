import type { LedgerRepository } from "../repo/repository";
import { DependencyGraph } from "../domain/graph";
import { resolveStatusMap } from "../domain/status";
import { planRelogin, isFullyResolved, type ReloginEntry, type ReloginStepInput } from "../domain/relogin";
import { computeTriage } from "./triage";
import { resolveCaseOnset, isCaseObservedWithinWindow } from "./caseOnset";
import { generateId, nowIso } from "../utils/id";
import { badRequest, notFound } from "../utils/errors";
import { OBSERVATION_WINDOW_HOURS } from "../config/masterData";
import type { ObservationStatus } from "../types";

export interface ReloginApiPlan {
  caseId: string;
  originId: string;
  windowStart: string;
  windowEnd: string;
  entries: ReloginEntry[];
  skipped: string[];
}

async function buildGraphAndStatus(repo: LedgerRepository, sessionId: string, now: Date) {
  const [services, links, observations] = await Promise.all([
    repo.listServices(sessionId),
    repo.listLinks(sessionId),
    repo.listObservations(sessionId)
  ]);
  const graph = new DependencyGraph(
    services.map((s) => ({ id: s.id, name: s.name })),
    links.map((l) => ({ id: l.id, dependentId: l.dependent_id, providerId: l.provider_id, route: l.route, propagation: l.propagation }))
  );
  const statusResolution = resolveStatusMap(
    observations.map((o) => ({ serviceId: o.service_id, status: o.status, observedAt: o.observed_at })),
    now,
    OBSERVATION_WINDOW_HOURS
  );
  return { graph, links, observations, ...statusResolution };
}

/**
 * requirements.md 9章：起点を選択した時点で予測影響集合の再ログイン順序を提示し、
 * その起点をケースに記録する（複数起点の場合は追加で記録する）。
 */
export async function getReloginPlan(
  repo: LedgerRepository,
  sessionId: string,
  originId: string,
  now: Date
): Promise<ReloginApiPlan> {
  const origin = await repo.findService(sessionId, originId);
  if (!origin) throw notFound("serviceNotFound");

  const { graph, links, observations, statusMap, windowStart, windowEnd } = await buildGraphAndStatus(repo, sessionId, now);

  const activeCase = await repo.findOpenCase(sessionId);
  if (!activeCase) throw badRequest("noActiveCase");

  const withinWindow = await isCaseObservedWithinWindow(repo, sessionId, activeCase.id, windowStart, windowEnd);
  if (!withinWindow) {
    await repo.updateCaseState(sessionId, activeCase.id, "discarded", null);
    throw badRequest("noActiveCase");
  }

  const caseId = activeCase.id;
  const existingOrigins = await repo.listCaseOrigins(sessionId, caseId);
  const alreadySelected = existingOrigins.some((o) => o.service_id === originId);

  // 起点が未記録（今回はじめて選ぶ）場合のみ、直近の切り分け結果の候補に含まれるか検証する。
  // 記録済みの起点は、再ログイン完了により自身が稼働観測へ変化していても再検証しない
  // （選択はケースに記録済みの事実として扱う。requirements.md 9章）。
  if (!alreadySelected) {
    const triage = await computeTriage(repo, sessionId, now);
    if (!triage.caseId) throw badRequest("noActiveCase");
    const isValidCandidate =
      triage.ranked.some((c) => c.serviceId === originId) || triage.origins.some((c) => c.serviceId === originId);
    if (!isValidCandidate) throw badRequest("originNotInPredictedSet");

    const sequence = existingOrigins.length + 1;
    await repo.createCaseOrigin(sessionId, {
      id: generateId(),
      caseId,
      serviceId: originId,
      sequence,
      selectedAt: now.toISOString()
    });
  }

  const currentCase = await repo.findCase(sessionId, caseId);
  if (currentCase && currentCase.state !== "resolved" && currentCase.state !== "origin_selected") {
    await repo.updateCaseState(sessionId, caseId, "origin_selected", null);
  }

  const onset = resolveCaseOnset(caseId, observations, windowStart, windowEnd);

  const allSteps = await repo.listAllSteps(sessionId);
  const stepsByService = new Map<string, ReloginStepInput[]>();
  for (const step of allSteps) {
    const list = stepsByService.get(step.service_id) ?? [];
    list.push({ position: step.position, body: step.body });
    stepsByService.set(step.service_id, list);
  }

  const alternateProviderByService = new Map<string, string>();
  for (const link of links) {
    if (link.route === "alternate" && !alternateProviderByService.has(link.dependent_id)) {
      alternateProviderByService.set(link.dependent_id, link.provider_id);
    }
  }

  const plan = planRelogin({ graph, originId, statusMap, onset, stepsByService, alternateProviderByService });

  return {
    caseId,
    originId,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    entries: plan.entries,
    skipped: plan.skipped
  };
}

export interface CompleteReloginResult {
  status: ObservationStatus;
  caseResolved: boolean;
}

/** requirements.md 9章：再ログイン完了は稼働の観測として記録し、全起点の予測影響集合が稼働ならケースを解決する。 */
export async function completeRelogin(
  repo: LedgerRepository,
  sessionId: string,
  serviceId: string,
  now: Date
): Promise<CompleteReloginResult> {
  const service = await repo.findService(sessionId, serviceId);
  if (!service) throw notFound("serviceNotFound");

  const id = generateId();
  const iso = now.toISOString();
  await repo.createObservation(sessionId, {
    id,
    serviceId,
    caseId: null,
    status: "working",
    observedAt: iso,
    recordedAt: nowIso()
  });

  const activeCase = await repo.findOpenCase(sessionId);
  if (!activeCase) return { status: "working", caseResolved: false };

  const origins = await repo.listCaseOrigins(sessionId, activeCase.id);
  if (origins.length === 0) return { status: "working", caseResolved: false };

  const { graph, statusMap } = await buildGraphAndStatus(repo, sessionId, now);
  const allResolved = origins.every((origin) => isFullyResolved(graph, origin.service_id, statusMap));

  if (allResolved) {
    await repo.updateCaseState(sessionId, activeCase.id, "resolved", now.toISOString());
    return { status: "working", caseResolved: true };
  }

  return { status: "working", caseResolved: false };
}
