import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createTestDb } from "../helpers/testDb";
import type { Env } from "../../src/env";

function testEnv(): Env {
  return { DB: createTestDb() as unknown as Env["DB"], ENVIRONMENT: "development" };
}

function getSetCookie(res: Response): string {
  return res.headers.get("set-cookie") ?? "";
}

describe("HTTP経路: セッションとハニーポット", () => {
  it("初回アクセスでセッションCookieが発行される", async () => {
    const app = createApp();
    const res = await app.request("/api/services", {}, testEnv());
    expect(res.status).toBe(200);
    expect(getSetCookie(res)).toContain("session_key=");
  });

  it("hpフィールドが埋まっているPOSTは静かに200を返し、実際には登録しない", async () => {
    const app = createApp();
    const env = testEnv();
    const res = await app.request(
      "/api/services",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bot", note: "", hp: "filled-by-bot" })
      },
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    const listRes = await app.request("/api/services", { headers: { cookie: getSetCookie(res) } }, env);
    const listBody = (await listRes.json()) as { services: unknown[] };
    expect(listBody.services).toEqual([]);
  });
});

describe("HTTP経路: サービスの作成〜切り分け〜再ログインの一連の流れ", () => {
  it("同一セッションで台帳登録から再ログイン完了まで一貫して動作する", async () => {
    const app = createApp();
    const env = testEnv();

    const initial = await app.request("/api/services", {}, env);
    const cookie = getSetCookie(initial);
    const withCookie = (init: RequestInit = {}): RequestInit => ({
      ...init,
      headers: { ...(init.headers ?? {}), cookie, "content-type": "application/json" }
    });

    const googleRes = await app.request(
      "/api/services",
      withCookie({ method: "POST", body: JSON.stringify({ name: "Google", note: "" }) }),
      env
    );
    const { service: google } = (await googleRes.json()) as { service: { id: string } };

    const gmailRes = await app.request(
      "/api/services",
      withCookie({ method: "POST", body: JSON.stringify({ name: "Gmail", note: "" }) }),
      env
    );
    const { service: gmail } = (await gmailRes.json()) as { service: { id: string } };

    const linkRes = await app.request(
      "/api/links",
      withCookie({
        method: "POST",
        body: JSON.stringify({ dependentId: gmail.id, providerId: google.id, route: "primary", propagation: "immediate" })
      }),
      env
    );
    expect(linkRes.status).toBe(201);

    await app.request(
      "/api/observations",
      withCookie({ method: "POST", body: JSON.stringify({ serviceId: google.id, status: "failed" }) }),
      env
    );
    await app.request(
      "/api/observations",
      withCookie({ method: "POST", body: JSON.stringify({ serviceId: gmail.id, status: "failed" }) }),
      env
    );

    const triageRes = await app.request("/api/triage", withCookie(), env);
    const triage = (await triageRes.json()) as { origins: Array<{ serviceId: string }> };
    expect(triage.origins.map((o) => o.serviceId)).toEqual([google.id]);

    const reloginRes = await app.request(`/api/relogin?originId=${google.id}`, withCookie(), env);
    const plan = (await reloginRes.json()) as { entries: Array<{ serviceId: string }> };
    expect(plan.entries.map((e) => e.serviceId)).toEqual([google.id, gmail.id]);

    await app.request(
      "/api/relogin/complete",
      withCookie({ method: "POST", body: JSON.stringify({ serviceId: google.id }) }),
      env
    );
    const completeGmailRes = await app.request(
      "/api/relogin/complete",
      withCookie({ method: "POST", body: JSON.stringify({ serviceId: gmail.id }) }),
      env
    );
    const completeGmail = (await completeGmailRes.json()) as { caseResolved: boolean };
    expect(completeGmail.caseResolved).toBe(true);
  });

  it("別セッション(Cookie無し)からは他人の台帳が見えない", async () => {
    const app = createApp();
    const env = testEnv();

    const first = await app.request("/api/services", {}, env);
    const cookie = getSetCookie(first);
    await app.request(
      "/api/services",
      { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Google", note: "" }) },
      env
    );

    const otherSessionRes = await app.request("/api/services", {}, env);
    const otherBody = (await otherSessionRes.json()) as { services: unknown[] };
    expect(otherBody.services).toEqual([]);
  });
});
