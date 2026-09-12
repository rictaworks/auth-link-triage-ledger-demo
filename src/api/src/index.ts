import { createApp } from "./app";
import { LedgerRepository } from "./repo/repository";
import type { Env } from "./env";

const app = createApp();

export default {
  fetch: app.fetch,

  /** requirements.md 20章：JST 03:00（UTC 18:00）に全テーブルを削除する日次リセット。 */
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const repo = new LedgerRepository(env.DB);
    await repo.purgeAll();
  }
};
