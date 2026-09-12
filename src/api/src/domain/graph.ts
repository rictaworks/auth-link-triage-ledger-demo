import type { Propagation, Route, ServiceKind } from "../types";

export interface GraphServiceInput {
  id: string;
  name: string;
}

export interface GraphLinkInput {
  id: string;
  dependentId: string;
  providerId: string;
  route: Route;
  propagation: Propagation;
}

export interface CycleServiceRef {
  id: string;
  name: string;
}

/**
 * サービスと連携（requirements.md 6章）からなる依存グラフ。
 * 主経路は 1 サービスにつき最大 1 本という不変条件（6.2）により、
 * 主経路のみで構成される部分グラフは常に森（各ノードの親が高々1つ）になる。
 * そのため候補から下流への経路は一意に定まる。
 */
export class DependencyGraph {
  private readonly servicesById = new Map<string, GraphServiceInput>();
  private readonly linksByDependent = new Map<string, GraphLinkInput[]>();
  private readonly linksByProvider = new Map<string, GraphLinkInput[]>();

  constructor(services: GraphServiceInput[], links: GraphLinkInput[]) {
    for (const service of services) {
      this.servicesById.set(service.id, service);
    }
    for (const link of links) {
      this.pushInto(this.linksByDependent, link.dependentId, link);
      this.pushInto(this.linksByProvider, link.providerId, link);
    }
  }

  private pushInto(map: Map<string, GraphLinkInput[]>, key: string, link: GraphLinkInput): void {
    const list = map.get(key);
    if (list) {
      list.push(link);
    } else {
      map.set(key, [link]);
    }
  }

  private serviceName(id: string): string {
    return this.servicesById.get(id)?.name ?? id;
  }

  /**
   * dependentId が providerId に依存する連携を追加した場合に循環が生じるかを判定する。
   * 循環が生じる場合は dependentId から始まり dependentId に戻るサービス列を返す。
   */
  wouldCycle(dependentId: string, providerId: string): CycleServiceRef[] | null {
    if (dependentId === providerId) {
      return [
        { id: dependentId, name: this.serviceName(dependentId) },
        { id: providerId, name: this.serviceName(providerId) }
      ];
    }

    // providerId から既存の連携（依存側→提供元）を辿り、dependentId へ戻れるかを調べる。
    const path: string[] = [providerId];
    const visited = new Set<string>([providerId]);

    const dfs = (current: string): boolean => {
      const outgoing = this.linksByDependent.get(current) ?? [];
      for (const link of outgoing) {
        const next = link.providerId;
        if (next === dependentId) {
          path.push(next);
          return true;
        }
        if (visited.has(next)) continue;
        visited.add(next);
        path.push(next);
        if (dfs(next)) return true;
        path.pop();
      }
      return false;
    };

    if (dfs(providerId)) {
      const fullPath = [dependentId, ...path];
      return fullPath.map((id) => ({ id, name: this.serviceName(id) }));
    }
    return null;
  }

  primaryLinkOf(serviceId: string): GraphLinkInput | undefined {
    const outgoing = this.linksByDependent.get(serviceId) ?? [];
    return outgoing.find((link) => link.route === "primary");
  }

  primaryProviderId(serviceId: string): string | null {
    return this.primaryLinkOf(serviceId)?.providerId ?? null;
  }

  /** 主経路を上流へ辿った提供元の列（近い順）。候補自身は含まない。 */
  ancestorsViaPrimary(serviceId: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>([serviceId]);
    let current = this.primaryProviderId(serviceId);
    while (current !== null && !visited.has(current)) {
      result.push(current);
      visited.add(current);
      current = this.primaryProviderId(current);
    }
    return result;
  }

  private primaryDependentsOf(serviceId: string): string[] {
    const incoming = this.linksByProvider.get(serviceId) ?? [];
    return incoming.filter((link) => link.route === "primary").map((link) => link.dependentId);
  }

  /** 主経路を下流へ辿った依存側の列。候補自身は含まない。 */
  descendantsViaPrimary(serviceId: string): string[] {
    const result: string[] = [];
    const stack = [...this.primaryDependentsOf(serviceId)];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);
      result.push(current);
      stack.push(...this.primaryDependentsOf(current));
    }
    return result;
  }

  /** 候補自身と、主経路を下流へ辿って到達する全サービス（requirements.md 8.3 予測影響集合）。 */
  predictedImpactSet(serviceId: string): string[] {
    return [serviceId, ...this.descendantsViaPrimary(serviceId)];
  }

  depth(serviceId: string): number {
    return this.ancestorsViaPrimary(serviceId).length;
  }

  /**
   * fromId から toId までの主経路を下流へ辿る一意な経路上に、伝播種別が
   * すべて "immediate" の連携のみが含まれるかを判定する（requirements.md 8.3）。
   */
  hasAllImmediatePrimaryPath(fromId: string, toId: string): boolean {
    if (fromId === toId) return true;
    // toId から primaryProviderId を辿って fromId に到達する経路を逆に検証する。
    const edges: GraphLinkInput[] = [];
    let current = toId;
    while (current !== fromId) {
      const link = this.primaryLinkOf(current);
      if (!link) return false; // fromId の子孫ではない
      edges.push(link);
      current = link.providerId;
    }
    return edges.every((link) => link.propagation === "immediate");
  }

  serviceKind(serviceId: string): ServiceKind {
    const isProvider = (this.linksByProvider.get(serviceId) ?? []).length > 0;
    const isDependent = (this.linksByDependent.get(serviceId) ?? []).length > 0;
    if (isProvider && isDependent) return "relay";
    if (isProvider) return "provider";
    if (isDependent) return "dependent";
    return "isolated";
  }

  /** 主経路の依存順（提供元が先）。同順位は名称順。 */
  topologicalOrder(ids: string[]): string[] {
    return [...ids].sort((a, b) => {
      const depthDiff = this.depth(a) - this.depth(b);
      if (depthDiff !== 0) return depthDiff;
      return this.serviceName(a).localeCompare(this.serviceName(b), "ja");
    });
  }
}
