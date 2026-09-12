import { describe, expect, it } from "vitest";
import { DependencyGraph, type GraphLinkInput, type GraphServiceInput } from "./graph";

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

describe("DependencyGraph cycle detection", () => {
  it("直接の自己依存を循環として検出する", () => {
    const graph = new DependencyGraph(services("A"), []);
    const cycle = graph.wouldCycle("A", "A");
    expect(cycle).not.toBeNull();
    expect(cycle?.map((s) => s.id)).toEqual(["A", "A"]);
  });

  it("A->B->A の追加を循環として検出する", () => {
    const graph = new DependencyGraph(services("A", "B"), [link("B", "A")]);
    const cycle = graph.wouldCycle("A", "B");
    expect(cycle).not.toBeNull();
    expect(cycle?.map((s) => s.id)).toEqual(["A", "B", "A"]);
  });

  it("A->B->C->A のような多段の循環を検出する", () => {
    const graph = new DependencyGraph(services("A", "B", "C"), [link("B", "A"), link("C", "B")]);
    const cycle = graph.wouldCycle("A", "C");
    expect(cycle).not.toBeNull();
    expect(cycle?.map((s) => s.id)).toEqual(["A", "C", "B", "A"]);
  });

  it("循環しない追加は null を返す", () => {
    const graph = new DependencyGraph(services("A", "B", "C"), [link("B", "A")]);
    expect(graph.wouldCycle("C", "B")).toBeNull();
  });
});

describe("DependencyGraph primary route traversal", () => {
  // A(root) <- B <- C (primary), D は代替経路のみで B に接続
  const graph = new DependencyGraph(services("A", "B", "C", "D"), [
    link("B", "A", "primary", "immediate"),
    link("C", "B", "primary", "delayed"),
    link("D", "B", "alternate")
  ]);

  it("primaryProviderId は主経路の提供元のみを返す", () => {
    expect(graph.primaryProviderId("B")).toBe("A");
    expect(graph.primaryProviderId("A")).toBeNull();
    expect(graph.primaryProviderId("D")).toBeNull();
  });

  it("ancestorsViaPrimary は主経路を上流へ辿った結果を返す", () => {
    expect(graph.ancestorsViaPrimary("C")).toEqual(["B", "A"]);
    expect(graph.ancestorsViaPrimary("A")).toEqual([]);
  });

  it("descendantsViaPrimary は主経路を下流へ辿った結果を返す（代替経路は含まない）", () => {
    expect(new Set(graph.descendantsViaPrimary("A"))).toEqual(new Set(["B", "C"]));
    expect(graph.descendantsViaPrimary("C")).toEqual([]);
  });

  it("predictedImpactSet は候補自身を含む", () => {
    expect(new Set(graph.predictedImpactSet("A"))).toEqual(new Set(["A", "B", "C"]));
  });

  it("depth はルートを0として主経路の段数を返す", () => {
    expect(graph.depth("A")).toBe(0);
    expect(graph.depth("B")).toBe(1);
    expect(graph.depth("C")).toBe(2);
    expect(graph.depth("D")).toBe(0);
  });

  it("hasAllImmediatePrimaryPath は経路上の全連携が即時のときのみ true", () => {
    expect(graph.hasAllImmediatePrimaryPath("A", "B")).toBe(true);
    expect(graph.hasAllImmediatePrimaryPath("A", "C")).toBe(false);
    expect(graph.hasAllImmediatePrimaryPath("B", "C")).toBe(false);
  });
});

describe("DependencyGraph serviceKind", () => {
  const graph = new DependencyGraph(services("Provider", "Relay", "Dependent", "Isolated"), [
    link("Relay", "Provider"),
    link("Dependent", "Relay")
  ]);

  it("依存されるのみのサービスは provider", () => {
    expect(graph.serviceKind("Provider")).toBe("provider");
  });

  it("双方のサービスは relay", () => {
    expect(graph.serviceKind("Relay")).toBe("relay");
  });

  it("依存するのみのサービスは dependent", () => {
    expect(graph.serviceKind("Dependent")).toBe("dependent");
  });

  it("連携のないサービスは isolated", () => {
    expect(graph.serviceKind("Isolated")).toBe("isolated");
  });
});

describe("DependencyGraph topologicalOrder", () => {
  it("主経路の依存順（提供元が先）に並べ、同順位は名称順にする", () => {
    const graph = new DependencyGraph(services("A", "B", "C", "Z"), [
      link("B", "A"),
      link("C", "A"),
      link("Z", "A")
    ]);
    expect(graph.topologicalOrder(["Z", "C", "B", "A"])).toEqual(["A", "B", "C", "Z"]);
  });
});
