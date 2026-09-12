import { describe, expect, it } from "vitest";
import { computeGraphLayout, primaryProviderId, serviceKind } from "@/lib/graphView";
import type { AuthLink, Service } from "@/lib/types";

function service(id: string, name: string): Service {
  return { id, name, note: "", createdAt: "2026-01-01T00:00:00Z" };
}

function link(
  dependentId: string,
  providerId: string,
  route: AuthLink["route"] = "primary",
  propagation: AuthLink["propagation"] = "delayed"
): AuthLink {
  return {
    id: `${dependentId}->${providerId}`,
    dependentId,
    providerId,
    route,
    propagation,
    createdAt: "2026-01-01T00:00:00Z"
  };
}

describe("serviceKind", () => {
  it("依存されるのみは provider", () => {
    const links = [link("b", "a")];
    expect(serviceKind(links, "a")).toBe("provider");
  });

  it("依存するのみは dependent", () => {
    const links = [link("b", "a")];
    expect(serviceKind(links, "b")).toBe("dependent");
  });

  it("連携がなければ isolated", () => {
    expect(serviceKind([], "x")).toBe("isolated");
  });
});

describe("primaryProviderId", () => {
  it("主経路の提供元を返す", () => {
    const links = [link("b", "a", "primary"), link("b", "c", "alternate")];
    expect(primaryProviderId(links, "b")).toBe("a");
  });

  it("主経路がなければ null", () => {
    expect(primaryProviderId([link("b", "c", "alternate")], "b")).toBeNull();
  });
});

describe("computeGraphLayout", () => {
  it("主経路の深さに応じて列を割り当てる", () => {
    const services = [service("a", "Google"), service("b", "Gmail"), service("c", "ServiceX")];
    const links = [link("b", "a", "primary"), link("c", "b", "primary")];
    const layout = computeGraphLayout(services, links);
    const a = layout.nodeById.get("a")!;
    const b = layout.nodeById.get("b")!;
    const c = layout.nodeById.get("c")!;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it("空のサービス一覧でも例外を投げない", () => {
    expect(() => computeGraphLayout([], [])).not.toThrow();
  });
});
