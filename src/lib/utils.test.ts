import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRuntime, formatRating, formatRelativeTime } from "./utils";

describe("formatRuntime", () => {
  it("formats hours and minutes, dropping zero parts", () => {
    expect(formatRuntime(0)).toBe(null); // falsy runtime → null
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(60)).toBe("1h");
    expect(formatRuntime(95)).toBe("1h 35m");
    expect(formatRuntime(null)).toBe(null);
  });
});

describe("formatRating", () => {
  it("renders one decimal, and null when absent", () => {
    expect(formatRating(7.834)).toBe("7.8");
    expect(formatRating(0)).toBe("0.0");
    expect(formatRating(null)).toBe(null);
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("says 'just now' under a minute", () => {
    expect(formatRelativeTime("2026-07-16T11:59:30.000Z")).toBe("just now");
  });

  it("scales to the largest fitting unit", () => {
    expect(formatRelativeTime("2026-07-16T11:00:00.000Z")).toBe("1 hour ago");
    expect(formatRelativeTime("2026-07-13T12:00:00.000Z")).toBe("3 days ago");
    expect(formatRelativeTime("2026-06-16T12:00:00.000Z")).toBe("last month");
  });
});
