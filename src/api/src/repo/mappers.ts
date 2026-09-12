import type {
  AuthLinkRow,
  CaseOriginRow,
  ObservationRow,
  ProcedureStepRow,
  ServiceRow,
  TriageCaseRow,
  TriggerEventRow
} from "./rows";
import type { AuthLink, CaseOrigin, Observation, ProcedureStep, Service, TriageCase, TriggerEvent } from "../types";

// sessionId はオーナーキー（実質的な認証情報）であり、API応答に含めるとセッション偽装の
// 手がかりを与えてしまう（httpOnly Cookie の意味が薄れる）ため、DTOには含めない。

export function toService(row: ServiceRow): Service {
  return { id: row.id, name: row.name, note: row.note, createdAt: row.created_at };
}

export function toAuthLink(row: AuthLinkRow): AuthLink {
  return {
    id: row.id,
    dependentId: row.dependent_id,
    providerId: row.provider_id,
    route: row.route,
    propagation: row.propagation,
    createdAt: row.created_at
  };
}

export function toProcedureStep(row: ProcedureStepRow): ProcedureStep {
  return { id: row.id, serviceId: row.service_id, position: row.position, body: row.body };
}

export function toObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    serviceId: row.service_id,
    caseId: row.case_id,
    status: row.status,
    observedAt: row.observed_at,
    recordedAt: row.recorded_at
  };
}

export function toTriggerEvent(row: TriggerEventRow): TriggerEvent {
  return {
    id: row.id,
    serviceId: row.service_id,
    kind: row.kind as TriggerEvent["kind"],
    occurredAt: row.occurred_at
  };
}

export function toTriageCase(row: TriageCaseRow): TriageCase {
  return {
    id: row.id,
    state: row.state,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at
  };
}

export function toCaseOrigin(row: CaseOriginRow): CaseOrigin {
  return {
    id: row.id,
    caseId: row.case_id,
    serviceId: row.service_id,
    sequence: row.sequence,
    selectedAt: row.selected_at
  };
}
