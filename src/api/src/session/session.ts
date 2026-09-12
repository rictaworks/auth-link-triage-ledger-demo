export interface SessionRepo {
  find(sessionId: string): Promise<boolean>;
  create(sessionId: string, nowIso: string): Promise<void>;
  touch(sessionId: string, nowIso: string): Promise<void>;
}

export interface ResolvedSession {
  sessionId: string;
  isNew: boolean;
}

/**
 * requirements.md 19章：Cookieベースのセッションキーをオーナーキーとする。
 * Cookieが無い、または日次リセット等で該当レコードが失われている場合は新規発行する。
 */
export async function resolveSessionId(
  cookieValue: string | undefined,
  repo: SessionRepo,
  now: Date,
  generateId: () => string
): Promise<ResolvedSession> {
  if (cookieValue) {
    const exists = await repo.find(cookieValue);
    if (exists) {
      await repo.touch(cookieValue, now.toISOString());
      return { sessionId: cookieValue, isNew: false };
    }
  }

  const sessionId = generateId();
  await repo.create(sessionId, now.toISOString());
  return { sessionId, isNew: true };
}
