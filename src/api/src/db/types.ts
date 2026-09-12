/**
 * D1Database（本番・Cloudflare Workers）と better-sqlite3 テストアダプタの共通形状。
 * リポジトリ層はこのインターフェースのみに依存し、実行環境に依存しない。
 */
export interface D1LikeStatement {
  bind(...values: unknown[]): D1LikeStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

export interface D1LikeDatabase {
  prepare(query: string): D1LikeStatement;
}
