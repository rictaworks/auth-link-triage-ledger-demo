export type Route = "primary" | "alternate";
export type Propagation = "immediate" | "delayed";
export type ObservationStatus = "failed" | "working";
export type TriggerKind =
  | "password_change"
  | "mfa_reset"
  | "device_change"
  | "logout_all_devices"
  | "account_recovery";
export type CaseState = "open" | "triaged" | "origin_selected" | "resolved" | "discarded";
export type RationaleCode = "explained_count" | "has_trigger" | "unobserved_count" | "depth";
export type ExclusionReasonCode = "self_working" | "immediate_path_to_working";

export interface Service {
  id: string;
  name: string;
  note: string;
  createdAt: string;
}

/** route === "alternate" のとき propagation は無意味（伝播種別を持たない）だが、
 * スキーマ簡素化のため既定値 "delayed" を格納し、UI/切り分けロジックの両方で無視する。 */
export interface AuthLink {
  id: string;
  dependentId: string;
  providerId: string;
  route: Route;
  propagation: Propagation;
  createdAt: string;
}

export interface ProcedureStep {
  id: string;
  serviceId: string;
  position: number;
  body: string;
}

export interface Observation {
  id: string;
  serviceId: string;
  caseId: string | null;
  status: ObservationStatus;
  observedAt: string;
  recordedAt: string;
}

export interface TriggerEvent {
  id: string;
  serviceId: string;
  kind: TriggerKind;
  occurredAt: string;
}

export interface TriageCase {
  id: string;
  state: CaseState;
  openedAt: string;
  resolvedAt: string | null;
}

export interface CaseOrigin {
  id: string;
  caseId: string;
  serviceId: string;
  sequence: number;
  selectedAt: string;
}

export interface ServiceKindResult {
  isProvider: boolean;
  isDependent: boolean;
}

export type ServiceKind = "provider" | "dependent" | "relay" | "isolated";
