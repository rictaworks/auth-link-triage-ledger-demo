import { describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { recordTriggerEvent } from "../../src/usecases/triggers";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setupService() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  const service = await createService(repo, "s", { name: "Google", note: "" }, NOW);
  return { repo, service };
}

describe("recordTriggerEvent", () => {
  it("過去の発生時刻であれば登録できる", async () => {
    const { repo, service } = await setupService();
    const event = await recordTriggerEvent(
      repo,
      "s",
      { serviceId: service.id, kind: "password_change", occurredAt: "2026-01-09T00:00:00Z" },
      NOW
    );
    expect(event.kind).toBe("password_change");
  });

  it("現在時刻ちょうどは拒否する", async () => {
    const { repo, service } = await setupService();
    await expect(
      recordTriggerEvent(repo, "s", { serviceId: service.id, kind: "password_change", occurredAt: NOW.toISOString() }, NOW)
    ).rejects.toThrow(ApiError);
  });

  it("未来の発生時刻は拒否する", async () => {
    const { repo, service } = await setupService();
    const future = new Date(NOW.getTime() + 1000).toISOString();
    await expect(
      recordTriggerEvent(repo, "s", { serviceId: service.id, kind: "password_change", occurredAt: future }, NOW)
    ).rejects.toThrow(ApiError);
  });
});
