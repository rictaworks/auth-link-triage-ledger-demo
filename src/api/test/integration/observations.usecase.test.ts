import { describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { recordObservation } from "../../src/usecases/observations";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setupService() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  const service = await createService(repo, "s", { name: "Google", note: "" }, NOW);
  return { repo, service };
}

describe("recordObservation", () => {
  it("未来時刻の観測は拒否する", async () => {
    const { repo, service } = await setupService();
    const future = new Date(NOW.getTime() + 60_000).toISOString();
    await expect(
      recordObservation(repo, "s", { serviceId: service.id, status: "failed", observedAt: future }, NOW)
    ).rejects.toThrow(ApiError);
  });

  it("失敗観測は開いているケースがなければ新規に開く", async () => {
    const { repo, service } = await setupService();
    const result = await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "failed", observedAt: NOW.toISOString() },
      NOW
    );
    expect(result.caseId).not.toBeNull();
    const cases = await repo.listCases("s");
    expect(cases).toHaveLength(1);
    expect(cases[0]?.state).toBe("open");
  });

  it("開いているケースがあれば同じケースに紐づける", async () => {
    const { repo, service } = await setupService();
    const first = await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "failed", observedAt: NOW.toISOString() },
      NOW
    );
    const later = new Date(NOW.getTime() + 1000);
    const second = await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "failed", observedAt: later.toISOString() },
      later
    );
    expect(second.caseId).toBe(first.caseId);
    expect(await repo.listCases("s")).toHaveLength(1);
  });

  it("稼働観測はケースに紐づけない", async () => {
    const { repo, service } = await setupService();
    const result = await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "working", observedAt: NOW.toISOString() },
      NOW
    );
    expect(result.caseId).toBeNull();
    expect(await repo.listCases("s")).toHaveLength(0);
  });

  it("起点選択済みのケースに新たな失敗観測があると切り分け中に戻す", async () => {
    const { repo, service } = await setupService();
    const first = await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "failed", observedAt: NOW.toISOString() },
      NOW
    );
    await repo.updateCaseState("s", first.caseId!, "origin_selected", null);

    const later = new Date(NOW.getTime() + 1000);
    await recordObservation(
      repo,
      "s",
      { serviceId: service.id, status: "failed", observedAt: later.toISOString() },
      later
    );

    const updatedCase = await repo.findCase("s", first.caseId!);
    expect(updatedCase?.state).toBe("triaged");
  });
});
