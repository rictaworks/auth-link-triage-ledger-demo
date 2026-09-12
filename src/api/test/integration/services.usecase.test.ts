import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService, deleteService, updateService } from "../../src/usecases/services";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

describe("createService", () => {
  let repo: LedgerRepository;

  beforeEach(async () => {
    const db = createTestDb();
    repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
  });

  it("正常な入力でサービスを作成する", async () => {
    const service = await createService(repo, "s", { name: "Google", note: "メイン垢" }, NOW);
    expect(service.name).toBe("Google");
    expect(service.note).toBe("メイン垢");
  });

  it("名称が空ならエラー", async () => {
    await expect(createService(repo, "s", { name: "  ", note: "" }, NOW)).rejects.toThrow(ApiError);
  });

  it("同一セッション内で名称が重複していればエラー", async () => {
    await createService(repo, "s", { name: "Google", note: "" }, NOW);
    await expect(createService(repo, "s", { name: "Google", note: "" }, NOW)).rejects.toThrow(ApiError);
  });

  it("上限を超えるとエラー", async () => {
    for (let i = 0; i < 50; i += 1) {
      await createService(repo, "s", { name: `Service${i}`, note: "" }, NOW);
    }
    await expect(createService(repo, "s", { name: "Overflow", note: "" }, NOW)).rejects.toThrow(ApiError);
  });
});

describe("deleteService", () => {
  let repo: LedgerRepository;

  beforeEach(async () => {
    const db = createTestDb();
    repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
  });

  it("提供元になっているサービスは削除を拒否する", async () => {
    const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
    const gmail = await createService(repo, "s", { name: "Gmail", note: "" }, NOW);
    await repo.createLink("s", {
      id: "l1",
      dependentId: gmail.id,
      providerId: google.id,
      route: "primary",
      propagation: "immediate",
      createdAt: NOW.toISOString()
    });
    await expect(deleteService(repo, "s", google.id)).rejects.toThrow(ApiError);
  });

  it("依存側のみのサービスは削除できる", async () => {
    const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
    const gmail = await createService(repo, "s", { name: "Gmail", note: "" }, NOW);
    await repo.createLink("s", {
      id: "l1",
      dependentId: gmail.id,
      providerId: google.id,
      route: "primary",
      propagation: "immediate",
      createdAt: NOW.toISOString()
    });
    await deleteService(repo, "s", gmail.id);
    expect(await repo.findService("s", gmail.id)).toBeNull();
    expect(await repo.listLinks("s")).toEqual([]);
  });

  it("存在しないサービスの削除はエラー", async () => {
    await expect(deleteService(repo, "s", "missing")).rejects.toThrow(ApiError);
  });
});

describe("updateService", () => {
  it("他サービスと名称が重複する更新は拒否する", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    await createService(repo, "s", { name: "Google", note: "" }, NOW);
    const gmail = await createService(repo, "s", { name: "Gmail", note: "" }, NOW);
    await expect(updateService(repo, "s", gmail.id, { name: "Google", note: "" })).rejects.toThrow(ApiError);
  });

  it("自分自身の名称を変えない更新は許可する", async () => {
    const db = createTestDb();
    const repo = new LedgerRepository(db);
    await repo.createSession("s", "2026-01-01T00:00:00Z");
    const gmail = await createService(repo, "s", { name: "Gmail", note: "old" }, NOW);
    const updated = await updateService(repo, "s", gmail.id, { name: "Gmail", note: "new" });
    expect(updated.note).toBe("new");
  });
});
