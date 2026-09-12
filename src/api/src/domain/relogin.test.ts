import { describe, expect, it } from "vitest";
import { DependencyGraph, type GraphLinkInput, type GraphServiceInput } from "./graph";
import { planRelogin, isFullyResolved } from "./relogin";
import type { StatusMap } from "./status";

function services(...names: string[]): GraphServiceInput[] {
  return names.map((name) => ({ id: name, name }));
}

function link(
  dependentId: string,
  providerId: string,
  route: "primary" | "alternate" = "primary",
  propagation: "immediate" | "delayed" = "delayed"
): GraphLinkInput {
  return { id: `${dependentId}->${providerId}`, dependentId, providerId, route, propagation };
}

function statusMap(entries: Record<string, { status: "failed" | "working"; observedAt: string }>): StatusMap {
  const map: StatusMap = new Map();
  for (const [id, v] of Object.entries(entries)) {
    map.set(id, { status: v.status, observedAt: new Date(v.observedAt) });
  }
  return map;
}

const ONSET = new Date("2026-01-10T00:00:00Z");

describe("planRelogin", () => {
  const graph = new DependencyGraph(services("Google", "Gmail", "ServiceX"), [
    link("Gmail", "Google", "primary", "immediate"),
    link("ServiceX", "Gmail", "primary", "immediate")
  ]);

  it("依存順（提供元を先）で並べ、手順を展開する", () => {
    const status = statusMap({
      Google: { status: "failed", observedAt: "2026-01-10T00:00:00Z" }
    });
    const steps = new Map([
      ["Google", [{ position: 1, body: "パスワードを再設定する" }]],
      ["Gmail", []]
    ]);
    const plan = planRelogin({
      graph,
      originId: "Google",
      statusMap: status,
      onset: ONSET,
      stepsByService: steps,
      alternateProviderByService: new Map()
    });
    expect(plan.entries.map((e) => e.serviceId)).toEqual(["Google", "Gmail", "ServiceX"]);
    expect(plan.entries[0]?.recorded).toBe(true);
    expect(plan.entries[1]?.recorded).toBe(false);
  });

  it("失効開始時刻以降に稼働と観測されたサービスは順序から除外する", () => {
    const status = statusMap({
      Google: { status: "failed", observedAt: "2026-01-10T00:00:00Z" },
      Gmail: { status: "working", observedAt: "2026-01-10T01:00:00Z" }
    });
    const plan = planRelogin({
      graph,
      originId: "Google",
      statusMap: status,
      onset: ONSET,
      stepsByService: new Map(),
      alternateProviderByService: new Map()
    });
    expect(plan.entries.map((e) => e.serviceId)).toEqual(["Google", "ServiceX"]);
    expect(plan.skipped).toEqual(["Gmail"]);
  });

  it("代替経路の提供元が失敗と観測されていない場合、代替経路の案内を付与する", () => {
    const graphWithAlt = new DependencyGraph(services("Google", "Gmail", "PasswordLogin"), [
      link("Gmail", "Google", "primary", "immediate"),
      link("Gmail", "PasswordLogin", "alternate")
    ]);
    const status = statusMap({
      Google: { status: "failed", observedAt: "2026-01-10T00:00:00Z" }
    });
    const plan = planRelogin({
      graph: graphWithAlt,
      originId: "Google",
      statusMap: status,
      onset: ONSET,
      stepsByService: new Map(),
      alternateProviderByService: new Map([["Gmail", "PasswordLogin"]])
    });
    const gmailEntry = plan.entries.find((e) => e.serviceId === "Gmail");
    expect(gmailEntry?.alternateHint).toBe("PasswordLogin");
  });

  it("代替経路の提供元が失敗と観測されている場合は案内しない", () => {
    const graphWithAlt = new DependencyGraph(services("Google", "Gmail", "PasswordLogin"), [
      link("Gmail", "Google", "primary", "immediate"),
      link("Gmail", "PasswordLogin", "alternate")
    ]);
    const status = statusMap({
      Google: { status: "failed", observedAt: "2026-01-10T00:00:00Z" },
      PasswordLogin: { status: "failed", observedAt: "2026-01-10T00:00:00Z" }
    });
    const plan = planRelogin({
      graph: graphWithAlt,
      originId: "Google",
      statusMap: status,
      onset: ONSET,
      stepsByService: new Map(),
      alternateProviderByService: new Map([["Gmail", "PasswordLogin"]])
    });
    const gmailEntry = plan.entries.find((e) => e.serviceId === "Gmail");
    expect(gmailEntry?.alternateHint).toBeNull();
  });
});

describe("isFullyResolved", () => {
  const graph = new DependencyGraph(services("Google", "Gmail"), [
    link("Gmail", "Google", "primary", "immediate")
  ]);

  it("予測影響集合の全サービスが稼働ならば true", () => {
    const status = statusMap({
      Google: { status: "working", observedAt: "2026-01-10T02:00:00Z" },
      Gmail: { status: "working", observedAt: "2026-01-10T02:00:00Z" }
    });
    expect(isFullyResolved(graph, "Google", status)).toBe(true);
  });

  it("いずれかが未稼働ならば false", () => {
    const status = statusMap({
      Google: { status: "working", observedAt: "2026-01-10T02:00:00Z" }
    });
    expect(isFullyResolved(graph, "Google", status)).toBe(false);
  });
});
