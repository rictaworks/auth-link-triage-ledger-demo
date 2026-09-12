import DatabaseConstructor, { type Database as SqliteDatabase } from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { D1LikeDatabase, D1LikeStatement } from "../../src/db/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "..", "..", "migrations", "0001_init.sql");

/**
 * D1Database（Cloudflare Workers）と同じ prepare().bind().all()/first()/run() の形を
 * better-sqlite3 の上に実装したテスト用アダプタ。requirements.md 20章「DB | D1（SQLite）。
 * デプロイ先を問わずSQLiteを用いる」の通り、本番と同じ SQL 方言で単体テストできる。
 */

class SqliteStatement implements D1LikeStatement {
  private boundValues: unknown[] = [];

  constructor(
    private readonly db: SqliteDatabase,
    private readonly sql: string
  ) {}

  bind(...values: unknown[]): D1LikeStatement {
    this.boundValues = values;
    return this;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const rows = this.db.prepare(this.sql).all(...this.boundValues) as T[];
    return { results: rows };
  }

  async first<T = unknown>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.boundValues) as T | undefined;
    return row ?? null;
  }

  async run(): Promise<{ success: boolean }> {
    this.db.prepare(this.sql).run(...this.boundValues);
    return { success: true };
  }
}

export function createTestDb(): D1LikeDatabase {
  const db = new DatabaseConstructor(":memory:");
  db.pragma("foreign_keys = ON");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return {
    prepare(query: string) {
      return new SqliteStatement(db, query);
    }
  };
}
