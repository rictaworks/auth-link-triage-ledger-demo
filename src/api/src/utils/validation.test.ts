import { describe, expect, it } from "vitest";
import { assertMaxLength, assertNonEmpty, isFutureTime, isPastOrPresentTime } from "./validation";
import { ApiError } from "./errors";

describe("assertNonEmpty", () => {
  it("空文字はエラーを投げる", () => {
    expect(() => assertNonEmpty("", "serviceNameRequired")).toThrow(ApiError);
  });
  it("空白のみもエラーを投げる", () => {
    expect(() => assertNonEmpty("   ", "serviceNameRequired")).toThrow(ApiError);
  });
  it("値があれば通過する", () => {
    expect(() => assertNonEmpty("Google", "serviceNameRequired")).not.toThrow();
  });
});

describe("assertMaxLength", () => {
  it("上限を超える場合はエラーを投げる", () => {
    expect(() => assertMaxLength("a".repeat(51), 50, "serviceNameTooLong")).toThrow(ApiError);
  });
  it("上限以内なら通過する", () => {
    expect(() => assertMaxLength("a".repeat(50), 50, "serviceNameTooLong")).not.toThrow();
  });
});

describe("isFutureTime", () => {
  it("未来の時刻は true", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isFutureTime(future, new Date())).toBe(true);
  });
  it("過去の時刻は false", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isFutureTime(past, new Date())).toBe(false);
  });
});

describe("isPastOrPresentTime", () => {
  it("現在時刻ちょうどは true", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(isPastOrPresentTime(now.toISOString(), now)).toBe(true);
  });
  it("未来は false", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const future = new Date(now.getTime() + 1000).toISOString();
    expect(isPastOrPresentTime(future, now)).toBe(false);
  });
});
