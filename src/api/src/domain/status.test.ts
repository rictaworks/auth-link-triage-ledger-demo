import { describe, expect, it } from "vitest";
import { resolveStatusMap, resolveOnsetTime, type StatusObservationInput } from "./status";

const HOUR = 60 * 60 * 1000;

function obs(serviceId: string, status: "failed" | "working", observedAt: string): StatusObservationInput {
  return { serviceId, status, observedAt };
}

describe("resolveStatusMap", () => {
  it("同一サービスは最新の観測時刻を現在の状況とする", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const observations = [
      obs("A", "failed", "2026-01-09T10:00:00Z"),
      obs("A", "working", "2026-01-09T12:00:00Z")
    ];
    const result = resolveStatusMap(observations, now, 72);
    expect(result.statusMap.get("A")?.status).toBe("working");
  });

  it("観測窓（72時間）より古い観測は除外する", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const observations = [obs("A", "failed", "2026-01-06T00:00:00Z")]; // 96時間前
    const result = resolveStatusMap(observations, now, 72);
    expect(result.statusMap.has("A")).toBe(false);
  });

  it("観測窓の境界（ちょうど72時間前）は含める", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const observations = [obs("A", "failed", new Date(now.getTime() - 72 * HOUR).toISOString())];
    const result = resolveStatusMap(observations, now, 72);
    expect(result.statusMap.get("A")?.status).toBe("failed");
  });

  it("窓の開始・終了時刻を返す", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const result = resolveStatusMap([], now, 72);
    expect(result.windowEnd.toISOString()).toBe(now.toISOString());
    expect(result.windowStart.toISOString()).toBe(new Date(now.getTime() - 72 * HOUR).toISOString());
  });

  it("観測されていないサービスは未観測（マップに存在しない）", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const result = resolveStatusMap([], now, 72);
    expect(result.statusMap.has("Unobserved")).toBe(false);
  });
});

describe("resolveOnsetTime", () => {
  it("最も早い失敗観測の時刻を失効開始時刻とする", () => {
    const observations = [
      obs("A", "failed", "2026-01-09T12:00:00Z"),
      obs("B", "failed", "2026-01-09T08:00:00Z"),
      obs("A", "working", "2026-01-09T05:00:00Z")
    ];
    const onset = resolveOnsetTime(observations);
    expect(onset?.toISOString()).toBe("2026-01-09T08:00:00.000Z");
  });

  it("失敗観測がなければ null を返す", () => {
    expect(resolveOnsetTime([obs("A", "working", "2026-01-09T12:00:00Z")])).toBeNull();
  });
});
