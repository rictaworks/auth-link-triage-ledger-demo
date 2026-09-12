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
export type ServiceKind = "provider" | "dependent" | "relay" | "isolated";

export interface Service {
  id: string;
  sessionId: string;
  name: string;
  note: string;
  createdAt: string;
}

export interface AuthLink {
  id: string;
  sessionId: string;
  dependentId: string;
  providerId: string;
  route: Route;
  propagation: Propagation;
  createdAt: string;
}

export interface ProcedureStep {
  id: string;
  sessionId: string;
  serviceId: string;
  position: number;
  body: string;
}

export interface Observation {
  id: string;
  sessionId: string;
  serviceId: string;
  caseId: string | null;
  status: ObservationStatus;
  observedAt: string;
  recordedAt: string;
}

export interface TriggerEvent {
  id: string;
  sessionId: string;
  serviceId: string;
  kind: TriggerKind;
  occurredAt: string;
}

export interface TriageCase {
  id: string;
  sessionId: string;
  state: CaseState;
  openedAt: string;
  resolvedAt: string | null;
}

export interface ProviderTemplate {
  id: string;
  name: string;
}

export interface CandidateEvaluation {
  serviceId: string;
  predicted: string[];
  explained: string[];
  unexplained: string[];
  unobserved: string[];
  hasTrigger: boolean;
  rationale: RationaleCode[];
}

export interface ContradictionRef {
  serviceId: string;
  reason: ExclusionReasonCode;
}

export interface ExcludedCandidate {
  serviceId: string;
  contradictions: ContradictionRef[];
}

export interface Recommendation {
  serviceId: string;
  distinguishes: Array<{ a: string; b: string }>;
}

export interface TriageResult {
  caseId: string | null;
  caseState: CaseState | null;
  windowStart: string;
  windowEnd: string;
  statuses: Record<string, ObservationStatus>;
  ranked: CandidateEvaluation[];
  excluded: ExcludedCandidate[];
  origins: CandidateEvaluation[];
  unexplained: string[];
  recommendations: Recommendation[];
}

export interface ReloginEntry {
  serviceId: string;
  steps: Array<{ position: number; body: string }>;
  recorded: boolean;
  alternateHint: string | null;
}

export interface ReloginPlan {
  caseId: string;
  originId: string;
  windowStart: string;
  windowEnd: string;
  entries: ReloginEntry[];
  skipped: string[];
}

export interface ApiErrorBody {
  error: string;
  message: string;
  path?: Array<{ id: string; name: string }>;
  existingPrimaryLinkId?: string;
  existingProviderId?: string;
}
