import type { LedgerRepository } from "../repo/repository";
import type { Observation, ObservationStatus } from "../types";
import { generateId } from "../utils/id";
import { badRequest, notFound } from "../utils/errors";
import { isFutureTime } from "../utils/validation";
import { LIMITS } from "../config/masterData";

export interface ObservationInput {
  serviceId: string;
  status: ObservationStatus;
  observedAt: string;
}

export interface RecordObservationResult {
  observation: Observation;
  caseId: string | null;
}

/**
 * requirements.md 7.1：失敗観測は開いているケースがなければ新規に開き、あれば紐づける。
 * 状態遷移図 16.1：起点選択済み(origin_selected)のケースに新たな失敗観測があれば切り分け中(triaged)へ戻す。
 */
export async function recordObservation(
  repo: LedgerRepository,
  sessionId: string,
  input: ObservationInput,
  now: Date
): Promise<RecordObservationResult> {
  const service = await repo.findService(sessionId, input.serviceId);
  if (!service) throw notFound("serviceNotFound");

  if (isFutureTime(input.observedAt, now)) {
    throw badRequest("observationFutureTime");
  }

  const count = await repo.countObservations(sessionId);
  if (count >= LIMITS.observationsPerSession) {
    throw badRequest("observationLimitExceeded");
  }

  let caseId: string | null = null;
  if (input.status === "failed") {
    const openCase = await repo.findOpenCase(sessionId);
    if (!openCase) {
      caseId = generateId();
      await repo.createCase(sessionId, { id: caseId, state: "open", openedAt: now.toISOString() });
    } else {
      caseId = openCase.id;
      if (openCase.state === "origin_selected") {
        await repo.updateCaseState(sessionId, openCase.id, "triaged", null);
      }
    }
  }

  const id = generateId();
  const recordedAt = now.toISOString();
  await repo.createObservation(sessionId, {
    id,
    serviceId: input.serviceId,
    caseId,
    status: input.status,
    observedAt: input.observedAt,
    recordedAt
  });

  return {
    observation: {
      id,
      sessionId,
      serviceId: input.serviceId,
      caseId,
      status: input.status,
      observedAt: input.observedAt,
      recordedAt
    },
    caseId
  };
}
