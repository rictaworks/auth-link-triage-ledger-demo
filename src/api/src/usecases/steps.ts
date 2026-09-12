import type { LedgerRepository } from "../repo/repository";
import type { ProcedureStep } from "../types";
import { generateId } from "../utils/id";
import { assertMaxLength, assertNonEmpty } from "../utils/validation";
import { badRequest, notFound } from "../utils/errors";
import { LIMITS } from "../config/masterData";

/** requirements.md 6.3：手順一覧を丸ごと置き換える（追加・並べ替え・削除を一括で反映）。 */
export async function replaceProcedureSteps(
  repo: LedgerRepository,
  sessionId: string,
  serviceId: string,
  bodies: string[]
): Promise<ProcedureStep[]> {
  const service = await repo.findService(sessionId, serviceId);
  if (!service) throw notFound("serviceNotFound");

  if (bodies.length > LIMITS.stepsPerService) {
    throw badRequest("stepLimitExceeded");
  }

  const trimmed = bodies.map((body) => body.trim());
  for (const body of trimmed) {
    assertNonEmpty(body, "stepBodyRequired");
    assertMaxLength(body, LIMITS.stepBodyMaxLength, "stepBodyTooLong");
  }

  const steps = trimmed.map((body) => ({ id: generateId(), body }));
  await repo.replaceSteps(sessionId, serviceId, steps);

  return steps.map((step, index) => ({
    id: step.id,
    serviceId,
    position: index,
    body: step.body
  }));
}
