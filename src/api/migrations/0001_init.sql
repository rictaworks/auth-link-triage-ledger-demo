-- requirements.md 11章 / 12章 ER図に対応するスキーマ。
-- 全テーブルが session_id を持ち、オーナーキーとして参照条件に必ず含める。

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_services_session ON services(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_services_session_name ON services(session_id, name);

CREATE TABLE IF NOT EXISTS auth_links (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  dependent_id TEXT NOT NULL REFERENCES services(id),
  provider_id TEXT NOT NULL REFERENCES services(id),
  route TEXT NOT NULL CHECK (route IN ('primary', 'alternate')),
  propagation TEXT NOT NULL CHECK (propagation IN ('immediate', 'delayed')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_links_session ON auth_links(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_links_dependent ON auth_links(session_id, dependent_id);
CREATE INDEX IF NOT EXISTS idx_auth_links_provider ON auth_links(session_id, provider_id);
-- requirements.md 6.2：1サービスにつき主経路は最大1本。
CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_links_primary_per_dependent
  ON auth_links(session_id, dependent_id)
  WHERE route = 'primary';
-- requirements.md 6.2：依存側と提供元が同一の連携を拒否する。
CREATE TRIGGER IF NOT EXISTS trg_auth_links_no_self_reference
  BEFORE INSERT ON auth_links
  WHEN NEW.dependent_id = NEW.provider_id
BEGIN
  SELECT RAISE(ABORT, 'self_reference_not_allowed');
END;

CREATE TABLE IF NOT EXISTS procedure_steps (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  service_id TEXT NOT NULL REFERENCES services(id),
  position INTEGER NOT NULL,
  body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_procedure_steps_session ON procedure_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_procedure_steps_service ON procedure_steps(session_id, service_id, position);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  service_id TEXT NOT NULL REFERENCES services(id),
  case_id TEXT REFERENCES triage_cases(id),
  status TEXT NOT NULL CHECK (status IN ('failed', 'working')),
  observed_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_service ON observations(session_id, service_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_observations_case ON observations(session_id, case_id);

CREATE TABLE IF NOT EXISTS trigger_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  service_id TEXT NOT NULL REFERENCES services(id),
  kind TEXT NOT NULL CHECK (kind IN ('password_change', 'mfa_reset', 'device_change', 'logout_all_devices', 'account_recovery')),
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trigger_events_session ON trigger_events(session_id);
CREATE INDEX IF NOT EXISTS idx_trigger_events_service ON trigger_events(session_id, service_id, occurred_at);

CREATE TABLE IF NOT EXISTS triage_cases (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  state TEXT NOT NULL CHECK (state IN ('open', 'triaged', 'origin_selected', 'resolved', 'discarded')),
  opened_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_triage_cases_session ON triage_cases(session_id);
CREATE INDEX IF NOT EXISTS idx_triage_cases_session_state ON triage_cases(session_id, state);

CREATE TABLE IF NOT EXISTS case_origins (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  case_id TEXT NOT NULL REFERENCES triage_cases(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  sequence INTEGER NOT NULL,
  selected_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_origins_session ON case_origins(session_id);
CREATE INDEX IF NOT EXISTS idx_case_origins_case ON case_origins(session_id, case_id, sequence);
