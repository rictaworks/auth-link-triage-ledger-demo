import type { CaseState, ExclusionReasonCode, Propagation, RationaleCode, Route, TriggerKind } from "../types";

/** requirements.md 11.2 マスタデータ件数の正。件数を変える場合は表と併せて更新すること。 */

export const ROUTES: readonly Route[] = ["primary", "alternate"];
export const PROPAGATIONS: readonly Propagation[] = ["immediate", "delayed"];
export const OBSERVATION_STATUSES = ["failed", "working"] as const;

export const TRIGGER_KINDS: readonly TriggerKind[] = [
  "password_change",
  "mfa_reset",
  "device_change",
  "logout_all_devices",
  "account_recovery"
];

export const CASE_STATES: readonly CaseState[] = ["open", "triaged", "origin_selected", "resolved", "discarded"];

export const RATIONALE_CODES: readonly RationaleCode[] = [
  "explained_count",
  "has_trigger",
  "unobserved_count",
  "depth"
];

export const EXCLUSION_REASON_CODES: readonly ExclusionReasonCode[] = [
  "self_working",
  "immediate_path_to_working"
];

export interface ProviderTemplate {
  id: string;
  name: string;
}

export const PROVIDER_TEMPLATES: readonly ProviderTemplate[] = [
  { id: "google", name: "Google" },
  { id: "apple", name: "Apple" },
  { id: "microsoft", name: "Microsoft" },
  { id: "line", name: "LINE" },
  { id: "yahoo_japan", name: "Yahoo! JAPAN" },
  { id: "meta", name: "Meta（Facebook）" },
  { id: "x", name: "X（旧Twitter）" },
  { id: "github", name: "GitHub" },
  { id: "amazon", name: "Amazon" },
  { id: "discord", name: "Discord" },
  { id: "slack", name: "Slack" },
  { id: "dropbox", name: "Dropbox" }
];

/** requirements.md 20章「上限」。超過時は登録を拒否する。 */
export const LIMITS = {
  servicesPerSession: 50,
  linksPerSession: 100,
  observationsPerSession: 500,
  triggerEventsPerSession: 100,
  stepsPerService: 30,
  stepBodyMaxLength: 200,
  noteMaxLength: 200,
  serviceNameMaxLength: 50,
  maxOrigins: 3,
  maxRecommendations: 3
} as const;

/** requirements.md 7.1 観測窓（72時間） */
export const OBSERVATION_WINDOW_HOURS = 72;

/** requirements.md 8.1 契機事象の対象期間（失効開始時刻の7日前から現在まで） */
export const TRIGGER_LOOKBACK_DAYS = 7;

export const APP_VERSION = "01.01.00";
