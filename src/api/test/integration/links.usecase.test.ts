import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/testDb";
import { LedgerRepository } from "../../src/repo/repository";
import { createService } from "../../src/usecases/services";
import { createLink } from "../../src/usecases/links";
import { LinkCycleError, PrimaryRouteConfirmationRequiredError } from "../../src/utils/domainErrors";
import { ApiError } from "../../src/utils/errors";

const NOW = new Date("2026-01-10T00:00:00Z");

async function setup() {
  const db = createTestDb();
  const repo = new LedgerRepository(db);
  await repo.createSession("s", "2026-01-01T00:00:00Z");
  return repo;
}

describe("createLink", () => {
  it("正常な連携を作成する", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    const b = await createService(repo, "s", { name: "B", note: "" }, NOW);
    const link = await createLink(
      repo,
      "s",
      { dependentId: a.id, providerId: b.id, route: "primary", propagation: "immediate" },
      NOW
    );
    expect(link.route).toBe("primary");
  });

  it("自己参照は拒否する", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    await expect(
      createLink(repo, "s", { dependentId: a.id, providerId: a.id, route: "primary", propagation: "delayed" }, NOW)
    ).rejects.toThrow(ApiError);
  });

  it("循環を構成する連携は拒否し、循環経路を返す", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    const b = await createService(repo, "s", { name: "B", note: "" }, NOW);
    await createLink(repo, "s", { dependentId: b.id, providerId: a.id, route: "alternate", propagation: "delayed" }, NOW);

    await expect(
      createLink(repo, "s", { dependentId: a.id, providerId: b.id, route: "alternate", propagation: "delayed" }, NOW)
    ).rejects.toThrow(LinkCycleError);
  });

  it("代替経路には伝播種別を持たせず delayed に固定する", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    const b = await createService(repo, "s", { name: "B", note: "" }, NOW);
    const link = await createLink(
      repo,
      "s",
      { dependentId: a.id, providerId: b.id, route: "alternate", propagation: "immediate" },
      NOW
    );
    expect(link.propagation).toBe("delayed");
  });

  it("2本目の主経路登録は確認要求エラーを投げ、confirmDowngradeで降格して登録する", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    const b = await createService(repo, "s", { name: "B", note: "" }, NOW);
    const c = await createService(repo, "s", { name: "C", note: "" }, NOW);
    await createLink(repo, "s", { dependentId: a.id, providerId: b.id, route: "primary", propagation: "delayed" }, NOW);

    await expect(
      createLink(repo, "s", { dependentId: a.id, providerId: c.id, route: "primary", propagation: "delayed" }, NOW)
    ).rejects.toThrow(PrimaryRouteConfirmationRequiredError);

    const newLink = await createLink(
      repo,
      "s",
      { dependentId: a.id, providerId: c.id, route: "primary", propagation: "delayed", confirmDowngrade: true },
      NOW
    );
    expect(newLink.providerId).toBe(c.id);

    const links = await repo.listLinks("s");
    const oldLink = links.find((l) => l.provider_id === b.id);
    expect(oldLink?.route).toBe("alternate");
  });

  it("上限を超える連携登録は拒否する", async () => {
    const repo = await setup();
    const a = await createService(repo, "s", { name: "A", note: "" }, NOW);
    const b = await createService(repo, "s", { name: "B", note: "" }, NOW);
    for (let i = 0; i < 100; i += 1) {
      await createLink(repo, "s", { dependentId: a.id, providerId: b.id, route: "alternate", propagation: "delayed" }, NOW);
    }
    await expect(
      createLink(repo, "s", { dependentId: a.id, providerId: b.id, route: "alternate", propagation: "delayed" }, NOW)
    ).rejects.toThrow(ApiError);
  });
});
