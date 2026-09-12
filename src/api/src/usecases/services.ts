import type { LedgerRepository } from "../repo/repository";
import { toService } from "../repo/mappers";
import type { Service } from "../types";
import { generateId } from "../utils/id";
import { assertMaxLength, assertNonEmpty } from "../utils/validation";
import { badRequest, conflict, notFound } from "../utils/errors";
import { LIMITS } from "../config/masterData";

export interface ServiceInput {
  name: string;
  note: string;
}

function validateInput(input: ServiceInput): { name: string; note: string } {
  const name = input.name.trim();
  const note = input.note.trim();
  assertNonEmpty(name, "serviceNameRequired");
  assertMaxLength(name, LIMITS.serviceNameMaxLength, "serviceNameTooLong");
  assertMaxLength(note, LIMITS.noteMaxLength, "noteTooLong");
  return { name, note };
}

export async function createService(repo: LedgerRepository, sessionId: string, input: ServiceInput, now: Date): Promise<Service> {
  const { name, note } = validateInput(input);

  const count = await repo.countServices(sessionId);
  if (count >= LIMITS.servicesPerSession) {
    throw badRequest("serviceLimitExceeded");
  }

  const existing = await repo.findServiceByName(sessionId, name);
  if (existing) {
    throw conflict("serviceNameDuplicate");
  }

  const id = generateId();
  const createdAt = now.toISOString();
  await repo.createService(sessionId, { id, name, note, createdAt });
  return { id, name, note, createdAt };
}

export async function updateService(
  repo: LedgerRepository,
  sessionId: string,
  id: string,
  input: ServiceInput
): Promise<Service> {
  const { name, note } = validateInput(input);

  const current = await repo.findService(sessionId, id);
  if (!current) throw notFound("serviceNotFound");

  const existing = await repo.findServiceByName(sessionId, name);
  if (existing && existing.id !== id) {
    throw conflict("serviceNameDuplicate");
  }

  await repo.updateService(sessionId, id, { name, note });
  return toService({ ...current, name, note });
}

export async function deleteService(repo: LedgerRepository, sessionId: string, id: string): Promise<void> {
  const current = await repo.findService(sessionId, id);
  if (!current) throw notFound("serviceNotFound");

  const usedAsProvider = await repo.isServiceUsedAsProvider(sessionId, id);
  if (usedAsProvider) {
    throw conflict("serviceDeleteRejectedHasDependents");
  }

  await repo.deleteServiceCascade(sessionId, id);
}
