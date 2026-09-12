import { describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { createLink } from "../../src/usecases/links";
import { recordObservation } from "../../src/usecases/observations";
import { computeTriage } from "../../src/usecases/triage";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setup() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  return repo;
}

describe("computeTriage", () => {
  it("失敗観測がなければ空の結果を返す", async () => {
    const repo = await setup();
    const result = await computeTriage(repo, "s", NOW);
    expect(result.caseId).toBeNull();
    expect(result.ranked).toEqual([]);
  });

  it("失敗を観測すると起点候補を計算し、ケースを triaged にする", async () => {
    const repo = await setup();
    const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
    const gmail = await createService(repo, "s", { name: "Gmail", note: "" }, NOW);
    await createLink(repo, "s", { dependentId: gmail.id, providerId: google.id, route: "primary", propagation: "immediate" }, NOW);

    await recordObservation(repo, "s", { serviceId: google.id, status: "failed", observedAt: NOW.toISOString() }, NOW);
    await recordObservation(repo, "s", { serviceId: gmail.id, status: "failed", observedAt: NOW.toISOString() }, NOW);

    const result = await computeTriage(repo, "s", NOW);
    expect(result.caseState).toBe("triaged");
    expect(result.origins.map((o) => o.serviceId)).toEqual([google.id]);

    const caseRow = await repo.findCase("s", result.caseId!);
    expect(caseRow?.state).toBe("triaged");
  });

  it("観測窓の全観測が窓外に流出したケースは discarded にする", async () => {
    const repo = await setup();
    const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
    await recordObservation(repo, "s", { serviceId: google.id, status: "failed", observedAt: NOW.toISOString() }, NOW);

    const muchLater = new Date(NOW.getTime() + 200 * 60 * 60 * 1000); // 200時間後（観測窓72時間を超過）
    const result = await computeTriage(repo, "s", muchLater);
    expect(result.caseId).toBeNull();

    const cases = await repo.listCases("s");
    expect(cases[0]?.state).toBe("discarded");
  });

  it("同一入力に対して同一の結果を返す（決定性）", async () => {
    const repo = await setup();
    const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
    await recordObservation(repo, "s", { serviceId: google.id, status: "failed", observedAt: NOW.toISOString() }, NOW);

    const r1 = await computeTriage(repo, "s", NOW);
    const r2 = await computeTriage(repo, "s", NOW);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});
