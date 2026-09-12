import { describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { createLink } from "../../src/usecases/links";
import { recordObservation } from "../../src/usecases/observations";
import { replaceProcedureSteps } from "../../src/usecases/steps";
import { getReloginPlan, completeRelogin } from "../../src/usecases/relogin";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setupChain() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  const google = await createService(repo, "s", { name: "Google", note: "" }, NOW);
  const gmail = await createService(repo, "s", { name: "Gmail", note: "" }, NOW);
  await createLink(repo, "s", { dependentId: gmail.id, providerId: google.id, route: "primary", propagation: "immediate" }, NOW);
  await replaceProcedureSteps(repo, "s", google.id, ["パスワードを再設定する"]);
  await recordObservation(repo, "s", { serviceId: google.id, status: "failed", observedAt: NOW.toISOString() }, NOW);
  await recordObservation(repo, "s", { serviceId: gmail.id, status: "failed", observedAt: NOW.toISOString() }, NOW);
  return { repo, google, gmail };
}

describe("getReloginPlan", () => {
  it("起点の予測影響集合を依存順で提示し、手順を展開する", async () => {
    const { repo, google, gmail } = await setupChain();
    const plan = await getReloginPlan(repo, "s", google.id, NOW);
    expect(plan.entries.map((e) => e.serviceId)).toEqual([google.id, gmail.id]);
    expect(plan.entries[0]?.recorded).toBe(true);

    const origins = await repo.listCaseOrigins("s", plan.caseId);
    expect(origins.map((o) => o.service_id)).toEqual([google.id]);

    const caseRow = await repo.findCase("s", plan.caseId);
    expect(caseRow?.state).toBe("origin_selected");
  });

  it("直近の切り分け候補に含まれない起点は拒否する", async () => {
    const { repo } = await setupChain();
    const stranger = await createService(repo, "s", { name: "Stranger", note: "" }, NOW);
    await expect(getReloginPlan(repo, "s", stranger.id, NOW)).rejects.toThrow(ApiError);
  });
});

describe("completeRelogin", () => {
  it("予測影響集合の全サービスが稼働すればケースを解決する", async () => {
    const { repo, google, gmail } = await setupChain();
    await getReloginPlan(repo, "s", google.id, NOW);

    const afterGoogle = await completeRelogin(repo, "s", google.id, NOW);
    expect(afterGoogle.caseResolved).toBe(false);

    const afterGmail = await completeRelogin(repo, "s", gmail.id, NOW);
    expect(afterGmail.caseResolved).toBe(true);

    const cases = await repo.listCases("s");
    expect(cases[0]?.state).toBe("resolved");
  });

  it("起点自身の再ログイン完了後も、同じ起点で手順画面を再取得できる（回帰）", async () => {
    // 起点(Google)自身が稼働観測に変わると、切り分け上は自己矛盾（self_working）で
    // 除外され得るが、選択済みの起点は再検証しないため originNotInPredictedSet にならないこと。
    const { repo, google, gmail } = await setupChain();
    const later = new Date(NOW.getTime() + 60_000);

    await getReloginPlan(repo, "s", google.id, NOW);
    await completeRelogin(repo, "s", google.id, later);

    const planAfterCompletingOrigin = await getReloginPlan(repo, "s", google.id, later);
    expect(planAfterCompletingOrigin.entries.map((e) => e.serviceId)).toEqual([gmail.id]);
    expect(planAfterCompletingOrigin.skipped).toEqual([google.id]);
  });
});
