import type { DependencyGraph } from "./graph";
import type { StatusMap } from "./status";

export interface ReloginStepInput {
  position: number;
  body: string;
}

export interface ReloginEntry {
  serviceId: string;
  steps: ReloginStepInput[];
  recorded: boolean;
  alternateHint: string | null;
}

export interface ReloginPlan {
  entries: ReloginEntry[];
  skipped: string[];
}

export interface PlanReloginInput {
  graph: DependencyGraph;
  originId: string;
  statusMap: StatusMap;
  onset: Date | null;
  stepsByService: ReadonlyMap<string, ReloginStepInput[]>;
  /** サービスIDごとの代替経路の提供元ID（存在する場合）。 */
  alternateProviderByService: ReadonlyMap<string, string>;
}

/**
 * requirements.md 9章：起点の予測影響集合を主経路の依存順で並べ、
 * 手順を展開し、失効開始時刻以降に稼働済みのサービスを除外する。
 */
export function planRelogin(input: PlanReloginInput): ReloginPlan {
  const { graph, originId, statusMap, onset, stepsByService, alternateProviderByService } = input;
  const predicted = graph.predictedImpactSet(originId);
  const ordered = graph.topologicalOrder(predicted);

  const entries: ReloginEntry[] = [];
  const skipped: string[] = [];

  for (const serviceId of ordered) {
    const entry = statusMap.get(serviceId);
    const isWorkingSinceOnset =
      entry?.status === "working" && (onset === null || entry.observedAt.getTime() >= onset.getTime());
    if (isWorkingSinceOnset) {
      skipped.push(serviceId);
      continue;
    }

    const steps = [...(stepsByService.get(serviceId) ?? [])].sort((a, b) => a.position - b.position);

    let alternateHint: string | null = null;
    const alternateProviderId = alternateProviderByService.get(serviceId);
    if (alternateProviderId) {
      const providerStatus = statusMap.get(alternateProviderId)?.status;
      if (providerStatus !== "failed") {
        alternateHint = alternateProviderId;
      }
    }

    entries.push({ serviceId, steps, recorded: steps.length > 0, alternateHint });
  }

  return { entries, skipped };
}

/** requirements.md 9章：予測影響集合の全サービスが稼働と観測された時点でケースを解決する。 */
export function isFullyResolved(graph: DependencyGraph, originId: string, statusMap: StatusMap): boolean {
  const predicted = graph.predictedImpactSet(originId);
  return predicted.every((serviceId) => statusMap.get(serviceId)?.status === "working");
}
