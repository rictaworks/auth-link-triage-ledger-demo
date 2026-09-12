import type { ObservationStatus } from "../types";

export interface StatusObservationInput {
  serviceId: string;
  status: ObservationStatus;
  observedAt: string; // ISO8601
}

export interface ServiceStatusEntry {
  status: ObservationStatus;
  observedAt: Date;
}

export type StatusMap = Map<string, ServiceStatusEntry>;

export interface StatusResolution {
  statusMap: StatusMap;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * requirements.md 7.1 / 8.1：観測窓内の最新観測から、サービスごとの現在の状況を導く。
 * 窓外の観測は除外する（履歴としてのみ保持され、切り分けの入力にはしない）。
 * 観測時刻も保持するのは、8.3「失効開始時刻以降に稼働と観測され」の判定に用いるため。
 */
export function resolveStatusMap(
  observations: readonly StatusObservationInput[],
  now: Date,
  windowHours: number
): StatusResolution {
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const statusMap: StatusMap = new Map();
  for (const observation of observations) {
    const observedAtMs = new Date(observation.observedAt).getTime();
    if (observedAtMs < windowStart.getTime() || observedAtMs > windowEnd.getTime()) continue;

    // observed_at が同時刻の場合、入力の並び順（recorded_at 昇順を想定）で後に来たものを優先する。
    const existing = statusMap.get(observation.serviceId);
    if (!existing || observedAtMs >= existing.observedAt.getTime()) {
      statusMap.set(observation.serviceId, { status: observation.status, observedAt: new Date(observedAtMs) });
    }
  }

  return { statusMap, windowStart, windowEnd };
}

/** requirements.md 8.1：ケース内で最も早い失敗観測の時刻を失効開始時刻とする。 */
export function resolveOnsetTime(observations: readonly StatusObservationInput[]): Date | null {
  let earliest: number | null = null;
  for (const observation of observations) {
    if (observation.status !== "failed") continue;
    const observedAtMs = new Date(observation.observedAt).getTime();
    if (earliest === null || observedAtMs < earliest) {
      earliest = observedAtMs;
    }
  }
  return earliest === null ? null : new Date(earliest);
}
