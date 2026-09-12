export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export function isProduction(env: Env): boolean {
  return env.ENVIRONMENT === "production";
}
