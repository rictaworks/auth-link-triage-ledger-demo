"use client";

import type { AuthLink, ObservationStatus, Service, ServiceKind } from "@/lib/types";
import { computeGraphLayout } from "@/lib/graphView";
import { STRINGS } from "@/config/strings";

export interface DependencyGraphViewProps {
  services: Service[];
  links: AuthLink[];
  statusMap?: Map<string, ObservationStatus>;
  highlightServiceIds?: Set<string>;
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;

function nodeFill(kind: ServiceKind): string {
  switch (kind) {
    case "provider":
      return "#e6edff";
    case "relay":
      return "#fff1da";
    case "dependent":
      return "#eef0f3";
    default:
      return "#f4f4f6";
  }
}

function statusStroke(status: ObservationStatus | undefined): string {
  if (status === "failed") return "#c0362c";
  if (status === "working") return "#1f8a4c";
  return "#9aa2af";
}

/**
 * requirements.md 10.1：主経路を実線、代替経路を破線で描いた有向図。即時・遅延を線種で区別する。
 * 色のみに頼らないよう、主経路（実線）のうち即時は無地の実線、遅延は長破線、
 * 代替経路は短破線とし、線種の組み合わせで3種類すべてを区別できるようにする。
 */
export function DependencyGraphView({ services, links, statusMap, highlightServiceIds }: DependencyGraphViewProps) {
  if (services.length === 0) {
    return <p className="empty-state">{STRINGS.common.empty}</p>;
  }

  const layout = computeGraphLayout(services, links);

  return (
    <div>
      <svg
        className="dependency-graph"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={STRINGS.ledger.dependencyGraphHeading}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5b6472" />
          </marker>
        </defs>
        {layout.edges.map((edge) => {
          const from = layout.nodeById.get(edge.fromId);
          const to = layout.nodeById.get(edge.toId);
          if (!from || !to) return null;
          const isAlternate = edge.route === "alternate";
          const isImmediate = edge.propagation === "immediate";
          const color = isAlternate ? "#9aa2af" : isImmediate ? "#c0362c" : "#2f5fd1";
          // 代替経路＝短破線、主経路の遅延＝長破線、主経路の即時＝実線、と線種自体で区別する。
          const dashArray = isAlternate ? "4 4" : isImmediate ? undefined : "14 5";
          const x1 = from.x + NODE_WIDTH;
          const y1 = from.y + NODE_HEIGHT / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_HEIGHT / 2;
          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={dashArray}
              markerEnd="url(#arrow)"
            />
          );
        })}
        {layout.nodes.map((node) => {
          const status = statusMap?.get(node.id);
          const highlighted = highlightServiceIds?.has(node.id);
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={nodeFill(node.kind)}
                stroke={statusMap ? statusStroke(status) : highlighted ? "#2f5fd1" : "#c7ccd4"}
                strokeWidth={highlighted ? 3 : 2}
              />
              <text x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2 + 5} textAnchor="middle" fontSize={13} fill="#1f2430">
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="field-hint" style={{ listStyle: "none", padding: 0, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <li style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="28" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#c0362c" strokeWidth={2} />
          </svg>
          {STRINGS.ledger.routePrimary}・{STRINGS.ledger.propagationImmediate}
        </li>
        <li style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="28" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#2f5fd1" strokeWidth={2} strokeDasharray="14 5" />
          </svg>
          {STRINGS.ledger.routePrimary}・{STRINGS.ledger.propagationDelayed}
        </li>
        <li style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="28" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#9aa2af" strokeWidth={2} strokeDasharray="4 4" />
          </svg>
          {STRINGS.ledger.routeAlternate}
        </li>
      </ul>
    </div>
  );
}
