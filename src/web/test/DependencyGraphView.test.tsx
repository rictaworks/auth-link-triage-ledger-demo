import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DependencyGraphView } from "@/components/DependencyGraphView";
import type { AuthLink, Service } from "@/lib/types";

function service(id: string, name: string): Service {
  return { id, name, note: "", createdAt: "2026-01-01T00:00:00Z" };
}

function link(
  id: string,
  dependentId: string,
  providerId: string,
  route: AuthLink["route"],
  propagation: AuthLink["propagation"]
): AuthLink {
  return { id, dependentId, providerId, route, propagation, createdAt: "2026-01-01T00:00:00Z" };
}

describe("DependencyGraphView", () => {
  it("主経路（即時・遅延）と代替経路を、色だけでなく線種（破線パターン）でも区別する", () => {
    const services = [service("a", "A"), service("b", "B"), service("c", "C"), service("d", "D")];
    const links = [
      link("l1", "b", "a", "primary", "immediate"),
      link("l2", "c", "a", "primary", "delayed"),
      link("l3", "d", "a", "alternate", "delayed")
    ];
    const { container } = render(<DependencyGraphView services={services} links={links} />);
    const lines = Array.from(container.querySelectorAll("svg.dependency-graph > line"));
    const dashArrays = lines.map((el) => el.getAttribute("stroke-dasharray"));

    expect(dashArrays).toContain(null); // 主経路・即時＝実線（dasharray無し）
    expect(new Set(dashArrays).size).toBeGreaterThanOrEqual(3); // 3種類とも異なる線種
  });
});
