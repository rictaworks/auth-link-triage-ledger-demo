import { describe, expect, it, vi } from "vitest";
import { resolveSessionId, type SessionRepo } from "./session";

function fakeRepo(existingIds: string[]): SessionRepo & { created: string[]; touched: string[] } {
  const created: string[] = [];
  const touched: string[] = [];
  return {
    created,
    touched,
    async find(id: string) {
      return existingIds.includes(id);
    },
    async create(id: string) {
      created.push(id);
    },
    async touch(id: string) {
      touched.push(id);
    }
  };
}

describe("resolveSessionId", () => {
  const now = new Date("2026-01-10T00:00:00Z");

  it("Cookieが無ければ新規セッションを作成する", async () => {
    const repo = fakeRepo([]);
    const result = await resolveSessionId(undefined, repo, now, () => "new-id");
    expect(result).toEqual({ sessionId: "new-id", isNew: true });
    expect(repo.created).toEqual(["new-id"]);
  });

  it("Cookieがあり既存セッションならそれを使い last_seen_at を更新する", async () => {
    const repo = fakeRepo(["existing-id"]);
    const result = await resolveSessionId("existing-id", repo, now, () => "new-id");
    expect(result).toEqual({ sessionId: "existing-id", isNew: false });
    expect(repo.touched).toEqual(["existing-id"]);
    expect(repo.created).toEqual([]);
  });

  it("Cookieがあるが該当セッションが存在しない場合は新規作成する（日次リセット後など）", async () => {
    const repo = fakeRepo([]);
    const result = await resolveSessionId("stale-id", repo, now, () => "new-id");
    expect(result).toEqual({ sessionId: "new-id", isNew: true });
    expect(repo.created).toEqual(["new-id"]);
  });
});
