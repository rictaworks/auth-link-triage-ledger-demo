import { badRequest } from "./errors";
import type { MessageKey } from "../config/messages";

export function assertNonEmpty(value: string, errorKey: MessageKey): void {
  if (value.trim().length === 0) {
    throw badRequest(errorKey);
  }
}

export function assertMaxLength(value: string, max: number, errorKey: MessageKey): void {
  if (value.length > max) {
    throw badRequest(errorKey);
  }
}

export function isFutureTime(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime();
}

export function isPastOrPresentTime(iso: string, now: Date): boolean {
  return new Date(iso).getTime() <= now.getTime();
}
