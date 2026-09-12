export interface ServiceRow {
  id: string;
  session_id: string;
  name: string;
  note: string;
  created_at: string;
}

export interface AuthLinkRow {
  id: string;
  session_id: string;
  dependent_id: string;
  provider_id: string;
  route: "primary" | "alternate";
  propagation: "immediate" | "delayed";
  created_at: string;
}

export interface ProcedureStepRow {
  id: string;
  session_id: string;
  service_id: string;
  position: number;
  body: string;
}

export interface ObservationRow {
  id: string;
  session_id: string;
  service_id: string;
  case_id: string | null;
  status: "failed" | "working";
  observed_at: string;
  recorded_at: string;
}

export interface TriggerEventRow {
  id: string;
  session_id: string;
  service_id: string;
  kind: string;
  occurred_at: string;
}

export interface TriageCaseRow {
  id: string;
  session_id: string;
  state: "open" | "triaged" | "origin_selected" | "resolved" | "discarded";
  opened_at: string;
  resolved_at: string | null;
}

export interface CaseOriginRow {
  id: string;
  session_id: string;
  case_id: string;
  service_id: string;
  sequence: number;
  selected_at: string;
}
