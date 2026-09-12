import type { LedgerRepository } from "../repo/repository";
import { DependencyGraph } from "../domain/graph";
import { resolveStatusMap } from "../domain/status";
import { runTriage, type CandidateEvaluation, type ExcludedCandidate, type Recommendation } from "../domain/triage";
import { OBSERVATION_WINDOW_HOURS, TRIGGER_LOOKBACK_DAYS } from "../config/masterData";
import type { CaseState, ObservationStatus } from "../types";
import { resolveCaseOnset } from "./caseOnset";
import type { StatusMap } from "../domain/status";

export interface TriageApiResult {
  caseId: string | null;
  caseState: CaseState | null;
  windowStart: string;
  windowEnd: string;
  statuses: Record<string, ObservationStatus>;
  ranked: CandidateEvaluation[];
  excluded: ExcludedCandidate[];
  origins: CandidateEvaluation[];
  unexplained: string[];
  recommendations: Recommendation[];
}

function toStatusRecord(statusMap: StatusMap): Record<string, ObservationStatus> {
  const record: Record<string, ObservationStatus> = {};
  for (const [serviceId, entry] of statusMap) {
    record[serviceId] = entry.status;
  }
  return record;
}

function emptyResult(
  caseId: string | null,
  caseState: CaseState | null,
  windowStart: Date,
  windowEnd: Date,
  statusMap: StatusMap
): TriageApiResult {
  return {
    caseId,
    caseState,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    statuses: toStatusRecord(statusMap),
    ranked: [],
    excluded: [],
    origins: [],
    unexplained: [],
    recommendations: []
  };
}

/**
 * requirements.md 8章：観測・契機事象・連携の変更のたびに再計算し、過去の計算結果を保持しない。
 * 状態遷移図 16.1：Open→Triaged、観測窓の全観測が窓外に流出した場合は Discarded とする。
 */
export async function computeTriage(repo: LedgerRepository, sessionId: string, now: Date): Promise<TriageApiResult> {
  const [services, links, observations, triggers] = await Promise.all([
    repo.listServices(sessionId),
    repo.listLinks(sessionId),
    repo.listObservations(sessionId),
    repo.listTriggers(sessionId)
  ]);

  const graph = new DependencyGraph(
    services.map((s) => ({ id: s.id, name: s.name })),
    links.map((l) => ({ id: l.id, dependentId: l.dependent_id, providerId: l.provider_id, route: l.route, propagation: l.propagation }))
  );

  const { statusMap, windowStart, windowEnd } = resolveStatusMap(
    observations.map((o) => ({ serviceId: o.service_id, status: o.status, observedAt: o.observed_at })),
    now,
    OBSERVATION_WINDOW_HOURS
  );

  let activeCase = await repo.findOpenCase(sessionId);

  if (activeCase) {
    const caseObservations = observations.filter((o) => o.case_id === activeCase!.id);
    const withinWindow = caseObservations.some((o) => {
      const t = new Date(o.observed_at).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });
    if (!withinWindow) {
      await repo.updateCaseState(sessionId, activeCase.id, "discarded", null);
      activeCase = null;
    }
  }

  const anyFailing = [...statusMap.values()].some((entry) => entry.status === "failed");
  if (!activeCase || !anyFailing) {
    return emptyResult(activeCase?.id ?? null, activeCase?.state ?? null, windowStart, windowEnd, statusMap);
  }

  const onset = resolveCaseOnset(activeCase.id, observations, windowStart, windowEnd);

  const triggeredServiceIds = new Set<string>();
  if (onset) {
    const lookbackStart = onset.getTime() - TRIGGER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    for (const trigger of triggers) {
      const occurredAtMs = new Date(trigger.occurred_at).getTime();
      if (occurredAtMs >= lookbackStart && occurredAtMs <= now.getTime()) {
        triggeredServiceIds.add(trigger.service_id);
      }
    }
  }

  const result = runTriage({ graph, statusMap, onset, triggeredServiceIds });

  if (activeCase.state === "open") {
    await repo.updateCaseState(sessionId, activeCase.id, "triaged", null);
    activeCase = { ...activeCase, state: "triaged" };
  }

  return {
    caseId: activeCase.id,
    caseState: activeCase.state,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    statuses: toStatusRecord(statusMap),
    ranked: result.ranked,
    excluded: result.excluded,
    origins: result.origins,
    unexplained: result.unexplained,
    recommendations: result.recommendations
  };
}
