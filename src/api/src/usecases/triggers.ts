import type { LedgerRepository } from "../repo/repository";
import type { TriggerEvent, TriggerKind } from "../types";
import { generateId } from "../utils/id";
import { badRequest, notFound } from "../utils/errors";
import { LIMITS } from "../config/masterData";

export interface TriggerInput {
  serviceId: string;
  kind: TriggerKind;
  occurredAt: string;
}

/** requirements.md 7.2：契機事象は対象サービスと発生時刻を持ち、発生時刻は現在より前であること。 */
export async function recordTriggerEvent(
  repo: LedgerRepository,
  sessionId: string,
  input: TriggerInput,
  now: Date
): Promise<TriggerEvent> {
  const service = await repo.findService(sessionId, input.serviceId);
  if (!service) throw notFound("serviceNotFound");

  // requirements.md 7.2「発生時刻は現在より前であること」= 現在時刻ちょうども不可とする厳密な過去のみ許可する。
  if (new Date(input.occurredAt).getTime() >= now.getTime()) {
    throw badRequest("triggerFutureTime");
  }

  const count = await repo.countTriggers(sessionId);
  if (count >= LIMITS.triggerEventsPerSession) {
    throw badRequest("triggerLimitExceeded");
  }

  const id = generateId();
  await repo.createTrigger(sessionId, { id, serviceId: input.serviceId, kind: input.kind, occurredAt: input.occurredAt });

  return { id, sessionId, serviceId: input.serviceId, kind: input.kind, occurredAt: input.occurredAt };
}
