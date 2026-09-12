import type { AuthLink, Service, ServiceKind } from "./types";

export function serviceKind(links: AuthLink[], id: string): ServiceKind {
  const isProvider = links.some((l) => l.providerId === id);
  const isDependent = links.some((l) => l.dependentId === id);
  if (isProvider && isDependent) return "relay";
  if (isProvider) return "provider";
  if (isDependent) return "dependent";
  return "isolated";
}

export function primaryProviderId(links: AuthLink[], id: string): string | null {
  return links.find((l) => l.dependentId === id && l.route === "primary")?.providerId ?? null;
}

function depthOf(id: string, primaryProviderOf: Map<string, string>): number {
  let current = primaryProviderOf.get(id);
  let depth = 0;
  const visited = new Set<string>([id]);
  while (current && !visited.has(current)) {
    depth += 1;
    visited.add(current);
    current = primaryProviderOf.get(current);
  }
  return depth;
}

export interface GraphNode {
  id: string;
  name: string;
  kind: ServiceKind;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  route: AuthLink["route"];
  propagation: AuthLink["propagation"];
}

export interface GraphLayout {
  nodes: GraphNode[];
  nodeById: Map<string, GraphNode>;
  edges: GraphEdge[];
  width: number;
  height: number;
}

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 64;
const MARGIN_X = 110;
const MARGIN_Y = 40;

/** 主経路の段数（依存の深さ）に基づいて列を割り当てる、簡易な層状レイアウト。 */
export function computeGraphLayout(services: Service[], links: AuthLink[]): GraphLayout {
  const primaryProviderOf = new Map<string, string>();
  for (const link of links) {
    if (link.route === "primary") primaryProviderOf.set(link.dependentId, link.providerId);
  }

  const depths = new Map(services.map((s) => [s.id, depthOf(s.id, primaryProviderOf)]));
  const maxDepth = services.length > 0 ? Math.max(...[...depths.values()]) : 0;

  const columns: Service[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const service of services) {
    columns[depths.get(service.id) ?? 0]!.push(service);
  }
  for (const column of columns) {
    column.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }

  const nodes: GraphNode[] = [];
  columns.forEach((column, columnIndex) => {
    column.forEach((service, rowIndex) => {
      nodes.push({
        id: service.id,
        name: service.name,
        kind: serviceKind(links, service.id),
        x: MARGIN_X + columnIndex * COLUMN_WIDTH,
        y: MARGIN_Y + rowIndex * ROW_HEIGHT
      });
    });
  });

  const width = MARGIN_X * 2 + maxDepth * COLUMN_WIDTH;
  const maxRows = Math.max(1, ...columns.map((c) => c.length));
  const height = MARGIN_Y * 2 + (maxRows - 1) * ROW_HEIGHT + 40;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: GraphEdge[] = links.map((l) => ({
    id: l.id,
    fromId: l.providerId,
    toId: l.dependentId,
    route: l.route,
    propagation: l.propagation
  }));

  return { nodes, edges, nodeById, width: Math.max(width, 320), height };
}
