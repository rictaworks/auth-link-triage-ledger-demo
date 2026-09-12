import type { LedgerRepository } from "../repo/repository";
import { DependencyGraph } from "../domain/graph";
import type { AuthLink, Propagation, Route } from "../types";
import { generateId } from "../utils/id";
import { badRequest, notFound } from "../utils/errors";
import { LinkCycleError, PrimaryRouteConfirmationRequiredError } from "../utils/domainErrors";
import { LIMITS } from "../config/masterData";

export interface LinkInput {
  dependentId: string;
  providerId: string;
  route: Route;
  propagation: Propagation;
  confirmDowngrade?: boolean;
}

async function buildGraph(repo: LedgerRepository, sessionId: string): Promise<DependencyGraph> {
  const [services, links] = await Promise.all([repo.listServices(sessionId), repo.listLinks(sessionId)]);
  return new DependencyGraph(
    services.map((s) => ({ id: s.id, name: s.name })),
    links.map((l) => ({ id: l.id, dependentId: l.dependent_id, providerId: l.provider_id, route: l.route, propagation: l.propagation }))
  );
}

export async function createLink(repo: LedgerRepository, sessionId: string, input: LinkInput, now: Date): Promise<AuthLink> {
  if (input.dependentId === input.providerId) {
    throw badRequest("linkSelfReference");
  }

  const [dependent, provider] = await Promise.all([
    repo.findService(sessionId, input.dependentId),
    repo.findService(sessionId, input.providerId)
  ]);
  if (!dependent) throw notFound("serviceNotFound");
  if (!provider) throw notFound("serviceNotFound");

  const graph = await buildGraph(repo, sessionId);
  const cyclePath = graph.wouldCycle(input.dependentId, input.providerId);
  if (cyclePath) {
    throw new LinkCycleError(cyclePath);
  }

  // requirements.md 6.2：代替経路には伝播種別を持たせない（既定値 delayed を格納する）。
  const propagation: Propagation = input.route === "alternate" ? "delayed" : input.propagation;

  if (input.route === "primary") {
    const existingPrimary = await repo.findPrimaryLinkForDependent(sessionId, input.dependentId);
    if (existingPrimary && !input.confirmDowngrade) {
      throw new PrimaryRouteConfirmationRequiredError(existingPrimary.id, existingPrimary.provider_id);
    }
    if (existingPrimary && input.confirmDowngrade) {
      await repo.downgradeLinkToAlternate(sessionId, existingPrimary.id);
    }
  }

  const count = await repo.countLinks(sessionId);
  if (count >= LIMITS.linksPerSession) {
    throw badRequest("linkLimitExceeded");
  }

  const id = generateId();
  const createdAt = now.toISOString();
  await repo.createLink(sessionId, {
    id,
    dependentId: input.dependentId,
    providerId: input.providerId,
    route: input.route,
    propagation,
    createdAt
  });

  return {
    id,
    dependentId: input.dependentId,
    providerId: input.providerId,
    route: input.route,
    propagation,
    createdAt
  };
}

export async function deleteLink(repo: LedgerRepository, sessionId: string, id: string): Promise<void> {
  const existing = await repo.findLink(sessionId, id);
  if (!existing) throw notFound("linkNotFound");
  await repo.deleteLink(sessionId, id);
}
