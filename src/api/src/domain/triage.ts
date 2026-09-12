import type { DependencyGraph } from "./graph";
import type { StatusMap } from "./status";
import type { ExclusionReasonCode, RationaleCode } from "../types";

export interface CandidateEvaluation {
  serviceId: string;
  predicted: string[];
  explained: string[];
  unexplained: string[];
  unobserved: string[];
  hasTrigger: boolean;
  rationale: RationaleCode[];
}

export interface ContradictionRef {
  serviceId: string;
  reason: ExclusionReasonCode;
}

export interface ExcludedCandidate {
  serviceId: string;
  contradictions: ContradictionRef[];
}

export interface OriginRound {
  origin: CandidateEvaluation;
  explainedFromTarget: string[];
}

export interface Recommendation {
  serviceId: string;
  distinguishes: Array<{ a: string; b: string }>;
}

export interface TriageResult {
  ranked: CandidateEvaluation[];
  excluded: ExcludedCandidate[];
  origins: CandidateEvaluation[];
  rounds: OriginRound[];
  unexplained: string[];
  recommendations: Recommendation[];
}

export interface RunTriageInput {
  graph: DependencyGraph;
  statusMap: StatusMap;
  onset: Date | null;
  triggeredServiceIds: ReadonlySet<string>;
  maxOrigins?: number;
  maxRecommendations?: number;
}

interface RawEvaluation {
  serviceId: string;
  predicted: string[];
  explained: string[];
  unexplained: string[];
  unobserved: string[];
  hasTrigger: boolean;
  contradictions: ContradictionRef[];
}

function enumerateCandidates(graph: DependencyGraph, targetFailing: ReadonlySet<string>): string[] {
  const candidates = new Set<string>();
  for (const failingId of targetFailing) {
    candidates.add(failingId);
    for (const ancestorId of graph.ancestorsViaPrimary(failingId)) {
      candidates.add(ancestorId);
    }
  }
  return [...candidates];
}

function evaluateCandidate(
  candidateId: string,
  graph: DependencyGraph,
  statusMap: StatusMap,
  onset: Date | null,
  targetFailing: ReadonlySet<string>,
  triggeredServiceIds: ReadonlySet<string>
): RawEvaluation {
  const predicted = graph.predictedImpactSet(candidateId);
  const predictedSet = new Set(predicted);
  const explained = predicted.filter((id) => targetFailing.has(id));
  const unexplained = [...targetFailing].filter((id) => !predictedSet.has(id));
  const unobserved = predicted.filter((id) => !statusMap.has(id));

  const contradictions: ContradictionRef[] = [];
  if (onset) {
    for (const id of predicted) {
      const entry = statusMap.get(id);
      if (!entry || entry.status !== "working") continue;
      if (entry.observedAt.getTime() < onset.getTime()) continue;
      if (id === candidateId) {
        contradictions.push({ serviceId: id, reason: "self_working" });
      } else if (graph.hasAllImmediatePrimaryPath(candidateId, id)) {
        contradictions.push({ serviceId: id, reason: "immediate_path_to_working" });
      }
    }
  }

  return {
    serviceId: candidateId,
    predicted,
    explained,
    unexplained,
    unobserved,
    hasTrigger: triggeredServiceIds.has(candidateId),
    contradictions
  };
}

function compareCandidates(graph: DependencyGraph, a: RawEvaluation, b: RawEvaluation): number {
  if (a.explained.length !== b.explained.length) return b.explained.length - a.explained.length;
  if (a.hasTrigger !== b.hasTrigger) return a.hasTrigger ? -1 : 1;
  if (a.unobserved.length !== b.unobserved.length) return a.unobserved.length - b.unobserved.length;
  const depthDiff = graph.depth(a.serviceId) - graph.depth(b.serviceId);
  if (depthDiff !== 0) return depthDiff;
  return a.serviceId.localeCompare(b.serviceId, "ja");
}

function decisiveRationale(graph: DependencyGraph, a: RawEvaluation, b: RawEvaluation): RationaleCode | null {
  if (a.explained.length !== b.explained.length) return "explained_count";
  if (a.hasTrigger !== b.hasTrigger) return "has_trigger";
  if (a.unobserved.length !== b.unobserved.length) return "unobserved_count";
  if (graph.depth(a.serviceId) !== graph.depth(b.serviceId)) return "depth";
  return null;
}

function toCandidateEvaluation(raw: RawEvaluation): CandidateEvaluation {
  return {
    serviceId: raw.serviceId,
    predicted: raw.predicted,
    explained: raw.explained,
    unexplained: raw.unexplained,
    unobserved: raw.unobserved,
    hasTrigger: raw.hasTrigger,
    rationale: []
  };
}

/** requirements.md 8.2〜8.5 を1ラウンド分実行する。 */
function evaluateRound(
  graph: DependencyGraph,
  statusMap: StatusMap,
  onset: Date | null,
  targetFailing: ReadonlySet<string>,
  triggeredServiceIds: ReadonlySet<string>
): { ranked: RawEvaluation[]; excluded: ExcludedCandidate[] } {
  const candidateIds = enumerateCandidates(graph, targetFailing).sort((a, b) => a.localeCompare(b, "ja"));
  const evaluations = candidateIds
    .map((id) => evaluateCandidate(id, graph, statusMap, onset, targetFailing, triggeredServiceIds))
    .filter((evaluation) => evaluation.explained.length > 0);

  const excluded: ExcludedCandidate[] = [];
  const survivors: RawEvaluation[] = [];
  for (const evaluation of evaluations) {
    if (evaluation.contradictions.length > 0) {
      excluded.push({ serviceId: evaluation.serviceId, contradictions: evaluation.contradictions });
    } else {
      survivors.push(evaluation);
    }
  }

  survivors.sort((a, b) => compareCandidates(graph, a, b));
  return { ranked: survivors, excluded };
}

function buildRecommendations(
  graph: DependencyGraph,
  statusMap: StatusMap,
  pool: RawEvaluation[],
  maxRecommendations: number
): Recommendation[] {
  if (pool.length < 2) return [];

  const scoreByService = new Map<string, { count: number; pairs: Array<{ a: string; b: string }> }>();

  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const a = pool[i];
      const b = pool[j];
      if (!a || !b) continue;
      const setA = new Set(a.predicted);
      const setB = new Set(b.predicted);
      const distinguishing = new Set<string>([...setA, ...setB].filter((id) => setA.has(id) !== setB.has(id)));
      for (const serviceId of distinguishing) {
        if (statusMap.has(serviceId)) continue; // 未観測のみが確認推奨の対象
        const entry = scoreByService.get(serviceId) ?? { count: 0, pairs: [] };
        entry.count += 1;
        entry.pairs.push({ a: a.serviceId, b: b.serviceId });
        scoreByService.set(serviceId, entry);
      }
    }
  }

  return [...scoreByService.entries()]
    .sort((x, y) => {
      if (y[1].count !== x[1].count) return y[1].count - x[1].count;
      return x[0].localeCompare(y[0], "ja");
    })
    .slice(0, maxRecommendations)
    .map(([serviceId, entry]) => ({ serviceId, distinguishes: entry.pairs }));
}

/**
 * requirements.md 8章：候補列挙 → 評価 → 除外 → 順位付け → 複数起点への再帰的適用 → 確認推奨。
 * 状態を持たず、同一入力に対して常に同一の結果を返す（決定性）。
 */
export function runTriage(input: RunTriageInput): TriageResult {
  const { graph, statusMap, onset, triggeredServiceIds } = input;
  const maxOrigins = input.maxOrigins ?? 3;
  const maxRecommendations = input.maxRecommendations ?? 3;

  const allFailing = new Set<string>();
  for (const [serviceId, entry] of statusMap) {
    if (entry.status === "failed") allFailing.add(serviceId);
  }

  if (allFailing.size === 0) {
    return { ranked: [], excluded: [], origins: [], rounds: [], unexplained: [], recommendations: [] };
  }

  const firstRound = evaluateRound(graph, statusMap, onset, allFailing, triggeredServiceIds);
  const rankedWithRationale = firstRound.ranked.map(toCandidateEvaluation);
  for (let i = 0; i < firstRound.ranked.length - 1; i += 1) {
    const current = firstRound.ranked[i];
    const next = firstRound.ranked[i + 1];
    if (!current || !next) continue;
    const code = decisiveRationale(graph, current, next);
    const target = rankedWithRationale[i];
    if (code && target) target.rationale = [code];
  }

  const origins: CandidateEvaluation[] = [];
  const rounds: OriginRound[] = [];
  const roundTopPools: RawEvaluation[][] = [];
  let remaining = new Set(allFailing);
  let currentRoundResult = firstRound;

  for (let roundIndex = 0; roundIndex < maxOrigins && remaining.size > 0; roundIndex += 1) {
    const roundResult =
      roundIndex === 0
        ? currentRoundResult
        : evaluateRound(graph, statusMap, onset, remaining, triggeredServiceIds);

    roundTopPools.push(roundResult.ranked.slice(0, 3));

    const top = roundResult.ranked[0];
    if (!top) break;

    const explainedFromTarget = top.explained.filter((id) => remaining.has(id));
    origins.push(toCandidateEvaluation(top));
    rounds.push({ origin: toCandidateEvaluation(top), explainedFromTarget });

    for (const id of explainedFromTarget) remaining.delete(id);
  }

  const pooledForRecommendations = new Map<string, RawEvaluation>();
  for (const pool of roundTopPools) {
    for (const evaluation of pool) {
      pooledForRecommendations.set(evaluation.serviceId, evaluation);
    }
  }
  const recommendations = buildRecommendations(
    graph,
    statusMap,
    [...pooledForRecommendations.values()],
    maxRecommendations
  );

  return {
    ranked: rankedWithRationale,
    excluded: firstRound.excluded,
    origins,
    rounds,
    unexplained: [...remaining].sort((a, b) => a.localeCompare(b, "ja")),
    recommendations
  };
}
