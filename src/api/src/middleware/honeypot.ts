import type { Context, Next } from "hono";

/**
 * requirements.md 19章：Bot対策はハニーポット方式。reCAPTCHA は用いない。
 * リクエストボディの hp フィールドが埋まっていれば bot とみなし、
 * 検知したことを悟らせないよう通常成功時と同じ 200 応答で静かに処理を打ち切る。
 * 本文を持つ POST/PATCH/PUT/DELETE リクエストでのみ body を読み、
 * 以降のハンドラは c.get("body") から読み直す（ボディストリームの二重読み込みを避けるため）。
 */
export async function honeypotGuard(c: Context, next: Next): Promise<Response | void> {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    await next();
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const honeypotValue = body.hp;
  if (typeof honeypotValue === "string" && honeypotValue.trim().length > 0) {
    return c.json({ ok: true }, 200);
  }

  c.set("body", body);
  await next();
}
