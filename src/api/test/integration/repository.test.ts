import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";

describe("LedgerRepository セッション分離", () => {
  let repo: LedgerRepository;

  beforeEach(async () => {
    const db = createTestDb();
    repo = new LedgerRepository(db);
    await repo.createSession("session-a", "2026-01-01T00:00:00Z");
    await repo.createSession("session-b", "2026-01-01T00:00:00Z");
  });

  it("別セッションのサービスは見えない", async () => {
    await repo.createService("session-a", { id: "s1", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" });
    const listA = await repo.listServices("session-a");
    const listB = await repo.listServices("session-b");
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(0);
  });

  it("同一名称は別セッションであれば許可される", async () => {
    await repo.createService("session-a", { id: "s1", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await expect(
      repo.createService("session-b", { id: "s2", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" })
    ).resolves.not.toThrow();
  });

  it("同一セッション内の同一名称は一意制約で拒否される", async () => {
    await repo.createService("session-a", { id: "s1", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await expect(
      repo.createService("session-a", { id: "s2", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" })
    ).rejects.toThrow();
  });
});

describe("LedgerRepository サービス削除", () => {
  let repo: LedgerRepository;

  beforeEach(async () => {
    const db = createTestDb();
    repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    await repo.createService("s", { id: "google", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createService("s", { id: "gmail", name: "Gmail", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createLink("s", {
      id: "l1",
      dependentId: "gmail",
      providerId: "google",
      route: "primary",
      propagation: "immediate",
      createdAt: "2026-01-01T00:00:00Z"
    });
  });

  it("提供元になっているサービスは削除できないと判定される", async () => {
    expect(await repo.isServiceUsedAsProvider("s", "google")).toBe(true);
    expect(await repo.isServiceUsedAsProvider("s", "gmail")).toBe(false);
  });

  it("依存側の連携は連鎖して削除される", async () => {
    await repo.deleteServiceCascade("s", "gmail");
    const links = await repo.listLinks("s");
    expect(links).toHaveLength(0);
    const services = await repo.listServices("s");
    expect(services.map((row) => row.id)).toEqual(["google"]);
  });
});

describe("LedgerRepository 連携の主経路一意制約", () => {
  it("同一依存側に2本目の主経路を直接INSERTすると拒否される", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    await repo.createService("s", { id: "a", name: "A", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createService("s", { id: "b", name: "B", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createService("s", { id: "c", name: "C", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createLink("s", {
      id: "l1",
      dependentId: "a",
      providerId: "b",
      route: "primary",
      propagation: "delayed",
      createdAt: "2026-01-01T00:00:00Z"
    });
    await expect(
      repo.createLink("s", {
        id: "l2",
        dependentId: "a",
        providerId: "c",
        route: "primary",
        propagation: "delayed",
        createdAt: "2026-01-01T00:00:00Z"
      })
    ).rejects.toThrow();
  });

  it("自己参照の連携はDBトリガーで拒否される", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    await repo.createService("s", { id: "a", name: "A", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await expect(
      repo.createLink("s", {
        id: "l1",
        dependentId: "a",
        providerId: "a",
        route: "primary",
        propagation: "delayed",
        createdAt: "2026-01-01T00:00:00Z"
      })
    ).rejects.toThrow();
  });
});

describe("LedgerRepository 観測とケース", () => {
  it("開いているケースを状態で検索できる", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    await repo.createCase("s", { id: "c1", state: "open", openedAt: "2026-01-01T00:00:00Z" });
    const openCase = await repo.findOpenCase("s");
    expect(openCase?.id).toBe("c1");

    await repo.updateCaseState("s", "c1", "resolved", "2026-01-02T00:00:00Z");
    expect(await repo.findOpenCase("s")).toBeNull();
  });
});

describe("LedgerRepository 日次リセット", () => {
  it("全セッション・全テーブルを削除する", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s1", "2026-01-01T00:00:00Z");
    await repo.createSession("s2", "2026-01-01T00:00:00Z");
    await repo.createService("s1", { id: "a", name: "A", note: "", createdAt: "2026-01-01T00:00:00Z" });
    await repo.createService("s2", { id: "b", name: "B", note: "", createdAt: "2026-01-01T00:00:00Z" });

    await repo.purgeAll();

    expect(await repo.listServices("s1")).toEqual([]);
    expect(await repo.listServices("s2")).toEqual([]);
    expect(await repo.findSession("s1")).toBe(false);
  });
});
