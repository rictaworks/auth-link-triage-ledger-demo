import { MESSAGES, type MessageKey } from "../config/messages";

export class ApiError extends Error {
  readonly status: number;
  readonly messageKey: MessageKey;

  constructor(status: number, messageKey: MessageKey) {
    super(MESSAGES[messageKey]);
    this.status = status;
    this.messageKey = messageKey;
  }
}

export function badRequest(messageKey: MessageKey): ApiError {
  return new ApiError(400, messageKey);
}

export function conflict(messageKey: MessageKey): ApiError {
  return new ApiError(409, messageKey);
}

export function notFound(messageKey: MessageKey = "notFound"): ApiError {
  return new ApiError(404, messageKey);
}
