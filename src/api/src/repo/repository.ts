import type { D1LikeDatabase } from "../db/types";
import type {
  AuthLinkRow,
  CaseOriginRow,
  ObservationRow,
  ProcedureStepRow,
  ServiceRow,
  TriageCaseRow,
  TriggerEventRow
} from "./rows";
import type { CaseState, ObservationStatus, Propagation, Route, TriggerKind } from "../types";

const OPEN_CASE_STATES: CaseState[] = ["open", "triaged", "origin_selected"];

/**
 * D1（本番）/ better-sqlite3（テスト）の両方に対応するデータアクセス層。
 * 全メソッドが sessionId を受け取り、参照条件に必ず session_id を含める（requirements.md 19章）。
 */
export class LedgerRepository {
  constructor(private readonly db: D1LikeDatabase) {}

  // --- sessions ---

  async findSession(sessionId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT session_id FROM sessions WHERE session_id = ?")
      .bind(sessionId)
      .first();
    return row !== null;
  }

  async createSession(sessionId: string, nowIso: string): Promise<void> {
    await this.db
      .prepare("INSERT INTO sessions (session_id, created_at, last_seen_at) VALUES (?, ?, ?)")
      .bind(sessionId, nowIso, nowIso)
      .run();
  }

  async touchSession(sessionId: string, nowIso: string): Promise<void> {
    await this.db
      .prepare("UPDATE sessions SET last_seen_at = ? WHERE session_id = ?")
      .bind(nowIso, sessionId)
      .run();
  }

  // --- services ---

  async listServices(sessionId: string): Promise<ServiceRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM services WHERE session_id = ? ORDER BY created_at ASC")
      .bind(sessionId)
      .all<ServiceRow>();
    return results;
  }

  async findService(sessionId: string, id: string): Promise<ServiceRow | null> {
    return this.db
      .prepare("SELECT * FROM services WHERE session_id = ? AND id = ?")
      .bind(sessionId, id)
      .first<ServiceRow>();
  }

  async findServiceByName(sessionId: string, name: string): Promise<ServiceRow | null> {
    return this.db
      .prepare("SELECT * FROM services WHERE session_id = ? AND name = ?")
      .bind(sessionId, name)
      .first<ServiceRow>();
  }

  async countServices(sessionId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM services WHERE session_id = ?")
      .bind(sessionId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async createService(sessionId: string, params: { id: string; name: string; note: string; createdAt: string }): Promise<void> {
    await this.db
      .prepare("INSERT INTO services (id, session_id, name, note, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(params.id, sessionId, params.name, params.note, params.createdAt)
      .run();
  }

  async updateService(sessionId: string, id: string, params: { name: string; note: string }): Promise<void> {
    await this.db
      .prepare("UPDATE services SET name = ?, note = ? WHERE session_id = ? AND id = ?")
      .bind(params.name, params.note, sessionId, id)
      .run();
  }

  async isServiceUsedAsProvider(sessionId: string, id: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT id FROM auth_links WHERE session_id = ? AND provider_id = ? LIMIT 1")
      .bind(sessionId, id)
      .first();
    return row !== null;
  }

  /** サービスと、それを依存側とする連携・手順・観測・契機・起点参照を連鎖削除する。 */
  async deleteServiceCascade(sessionId: string, id: string): Promise<void> {
    await this.db.prepare("DELETE FROM auth_links WHERE session_id = ? AND dependent_id = ?").bind(sessionId, id).run();
    await this.db.prepare("DELETE FROM procedure_steps WHERE session_id = ? AND service_id = ?").bind(sessionId, id).run();
    await this.db.prepare("DELETE FROM observations WHERE session_id = ? AND service_id = ?").bind(sessionId, id).run();
    await this.db.prepare("DELETE FROM trigger_events WHERE session_id = ? AND service_id = ?").bind(sessionId, id).run();
    await this.db.prepare("DELETE FROM case_origins WHERE session_id = ? AND service_id = ?").bind(sessionId, id).run();
    await this.db.prepare("DELETE FROM services WHERE session_id = ? AND id = ?").bind(sessionId, id).run();
  }

  // --- auth_links ---

  async listLinks(sessionId: string): Promise<AuthLinkRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM auth_links WHERE session_id = ? ORDER BY created_at ASC")
      .bind(sessionId)
      .all<AuthLinkRow>();
    return results;
  }

  async findLink(sessionId: string, id: string): Promise<AuthLinkRow | null> {
    return this.db
      .prepare("SELECT * FROM auth_links WHERE session_id = ? AND id = ?")
      .bind(sessionId, id)
      .first<AuthLinkRow>();
  }

  async findPrimaryLinkForDependent(sessionId: string, dependentId: string): Promise<AuthLinkRow | null> {
    return this.db
      .prepare("SELECT * FROM auth_links WHERE session_id = ? AND dependent_id = ? AND route = 'primary'")
      .bind(sessionId, dependentId)
      .first<AuthLinkRow>();
  }

  async countLinks(sessionId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM auth_links WHERE session_id = ?")
      .bind(sessionId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async createLink(
    sessionId: string,
    params: {
      id: string;
      dependentId: string;
      providerId: string;
      route: Route;
      propagation: Propagation;
      createdAt: string;
    }
  ): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO auth_links (id, session_id, dependent_id, provider_id, route, propagation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(params.id, sessionId, params.dependentId, params.providerId, params.route, params.propagation, params.createdAt)
      .run();
  }

  async downgradeLinkToAlternate(sessionId: string, id: string): Promise<void> {
    await this.db
      .prepare("UPDATE auth_links SET route = 'alternate', propagation = 'delayed' WHERE session_id = ? AND id = ?")
      .bind(sessionId, id)
      .run();
  }

  async deleteLink(sessionId: string, id: string): Promise<void> {
    await this.db.prepare("DELETE FROM auth_links WHERE session_id = ? AND id = ?").bind(sessionId, id).run();
  }

  // --- procedure_steps ---

  async listSteps(sessionId: string, serviceId: string): Promise<ProcedureStepRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM procedure_steps WHERE session_id = ? AND service_id = ? ORDER BY position ASC")
      .bind(sessionId, serviceId)
      .all<ProcedureStepRow>();
    return results;
  }

  async listAllSteps(sessionId: string): Promise<ProcedureStepRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM procedure_steps WHERE session_id = ? ORDER BY service_id ASC, position ASC")
      .bind(sessionId)
      .all<ProcedureStepRow>();
    return results;
  }

  /** 手順一覧を丸ごと置き換える（追加・並べ替え・削除を一括で反映する）。 */
  async replaceSteps(
    sessionId: string,
    serviceId: string,
    steps: Array<{ id: string; body: string }>
  ): Promise<void> {
    await this.db.prepare("DELETE FROM procedure_steps WHERE session_id = ? AND service_id = ?").bind(sessionId, serviceId).run();
    let position = 0;
    for (const step of steps) {
      await this.db
        .prepare("INSERT INTO procedure_steps (id, session_id, service_id, position, body) VALUES (?, ?, ?, ?, ?)")
        .bind(step.id, sessionId, serviceId, position, step.body)
        .run();
      position += 1;
    }
  }

  // --- observations ---

  async listObservations(sessionId: string): Promise<ObservationRow[]> {
    // observed_at が同時刻の場合は recorded_at（実際に記録された順）で決着させる。
    const { results } = await this.db
      .prepare("SELECT * FROM observations WHERE session_id = ? ORDER BY observed_at ASC, recorded_at ASC")
      .bind(sessionId)
      .all<ObservationRow>();
    return results;
  }

  async countObservations(sessionId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM observations WHERE session_id = ?")
      .bind(sessionId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async createObservation(
    sessionId: string,
    params: {
      id: string;
      serviceId: string;
      caseId: string | null;
      status: ObservationStatus;
      observedAt: string;
      recordedAt: string;
    }
  ): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO observations (id, session_id, service_id, case_id, status, observed_at, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(params.id, sessionId, params.serviceId, params.caseId, params.status, params.observedAt, params.recordedAt)
      .run();
  }

  // --- trigger_events ---

  async listTriggers(sessionId: string): Promise<TriggerEventRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM trigger_events WHERE session_id = ? ORDER BY occurred_at ASC")
      .bind(sessionId)
      .all<TriggerEventRow>();
    return results;
  }

  async countTriggers(sessionId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM trigger_events WHERE session_id = ?")
      .bind(sessionId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async createTrigger(
    sessionId: string,
    params: { id: string; serviceId: string; kind: TriggerKind; occurredAt: string }
  ): Promise<void> {
    await this.db
      .prepare("INSERT INTO trigger_events (id, session_id, service_id, kind, occurred_at) VALUES (?, ?, ?, ?, ?)")
      .bind(params.id, sessionId, params.serviceId, params.kind, params.occurredAt)
      .run();
  }

  // --- triage_cases ---

  async listCases(sessionId: string): Promise<TriageCaseRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM triage_cases WHERE session_id = ? ORDER BY opened_at DESC")
      .bind(sessionId)
      .all<TriageCaseRow>();
    return results;
  }

  async findCase(sessionId: string, id: string): Promise<TriageCaseRow | null> {
    return this.db
      .prepare("SELECT * FROM triage_cases WHERE session_id = ? AND id = ?")
      .bind(sessionId, id)
      .first<TriageCaseRow>();
  }

  async findOpenCase(sessionId: string): Promise<TriageCaseRow | null> {
    const placeholders = OPEN_CASE_STATES.map(() => "?").join(", ");
    return this.db
      .prepare(
        `SELECT * FROM triage_cases WHERE session_id = ? AND state IN (${placeholders}) ORDER BY opened_at DESC LIMIT 1`
      )
      .bind(sessionId, ...OPEN_CASE_STATES)
      .first<TriageCaseRow>();
  }

  async createCase(sessionId: string, params: { id: string; state: CaseState; openedAt: string }): Promise<void> {
    await this.db
      .prepare("INSERT INTO triage_cases (id, session_id, state, opened_at, resolved_at) VALUES (?, ?, ?, ?, NULL)")
      .bind(params.id, sessionId, params.state, params.openedAt)
      .run();
  }

  async updateCaseState(
    sessionId: string,
    id: string,
    state: CaseState,
    resolvedAt: string | null
  ): Promise<void> {
    await this.db
      .prepare("UPDATE triage_cases SET state = ?, resolved_at = ? WHERE session_id = ? AND id = ?")
      .bind(state, resolvedAt, sessionId, id)
      .run();
  }

  // --- case_origins ---

  async listCaseOrigins(sessionId: string, caseId: string): Promise<CaseOriginRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM case_origins WHERE session_id = ? AND case_id = ? ORDER BY sequence ASC")
      .bind(sessionId, caseId)
      .all<CaseOriginRow>();
    return results;
  }

  async createCaseOrigin(
    sessionId: string,
    params: { id: string; caseId: string; serviceId: string; sequence: number; selectedAt: string }
  ): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO case_origins (id, session_id, case_id, service_id, sequence, selected_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(params.id, sessionId, params.caseId, params.serviceId, params.sequence, params.selectedAt)
      .run();
  }

  // --- 日次リセット（全セッション対象・session_id条件なし） ---

  async purgeAll(): Promise<void> {
    const tables = [
      "case_origins",
      "observations",
      "trigger_events",
      "procedure_steps",
      "auth_links",
      "triage_cases",
      "services",
      "sessions"
    ];
    for (const table of tables) {
      await this.db.prepare(`DELETE FROM ${table}`).run();
    }
  }
}
