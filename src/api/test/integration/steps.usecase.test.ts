import { describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { replaceProcedureSteps } from "../../src/usecases/steps";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setupService() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  const service = await createService(repo, "s", { name: "Google", note: "" }, NOW);
  return { repo, service };
}

describe("replaceProcedureSteps", () => {
  it("手順を順序付きで登録する", async () => {
    const { repo, service } = await setupService();
    const steps = await replaceProcedureSteps(repo, "s", service.id, ["パスワードを入力する", "二段階認証を入力する"]);
    expect(steps.map((s) => s.position)).toEqual([0, 1]);
    expect(steps.map((s) => s.body)).toEqual(["パスワードを入力する", "二段階認証を入力する"]);
  });

  it("空の手順は拒否する", async () => {
    const { repo, service } = await setupService();
    await expect(replaceProcedureSteps(repo, "s", service.id, ["  "])).rejects.toThrow(ApiError);
  });

  it("上限を超える手順数は拒否する", async () => {
    const { repo, service } = await setupService();
    const bodies = Array.from({ length: 31 }, (_, i) => `手順${i}`);
    await expect(replaceProcedureSteps(repo, "s", service.id, bodies)).rejects.toThrow(ApiError);
  });

  it("再登録で並べ替え・削除が反映される", async () => {
    const { repo, service } = await setupService();
    await replaceProcedureSteps(repo, "s", service.id, ["A", "B", "C"]);
    const updated = await replaceProcedureSteps(repo, "s", service.id, ["C", "A"]);
    expect(updated.map((s) => s.body)).toEqual(["C", "A"]);
    const persisted = await repo.listSteps("s", service.id);
    expect(persisted).toHaveLength(2);
  });
});
