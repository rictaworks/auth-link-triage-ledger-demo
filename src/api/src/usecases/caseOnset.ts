import type { LedgerRepository } from "../repo/repository";
import { resolveOnsetTime } from "../domain/status";
import type { ObservationRow } from "../repo/rows";

/** requirements.md 8.1：ケース内で最も早い失敗観測の時刻（観測窓内のみ）を失効開始時刻とする。 */
export function resolveCaseOnset(caseId: string, observations: readonly ObservationRow[], windowStart: Date, windowEnd: Date): Date | null {
  const caseObservationsWithinWindow = observations
    .filter((o) => o.case_id === caseId)
    .filter((o) => {
      const t = new Date(o.observed_at).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    })
    .map((o) => ({ serviceId: o.service_id, status: o.status, observedAt: o.observed_at }));

  return resolveOnsetTime(caseObservationsWithinWindow);
}

export async function isCaseObservedWithinWindow(
  repo: LedgerRepository,
  sessionId: string,
  caseId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<boolean> {
  const observations = await repo.listObservations(sessionId);
  return observations
    .filter((o) => o.case_id === caseId)
    .some((o) => {
      const t = new Date(o.observed_at).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });
}
