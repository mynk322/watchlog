import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimit } from "./rate-limit";

beforeEach(() => __resetRateLimit());

describe("rateLimit", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 1000, now).allowed).toBe(true);
    }
    const blocked = rateLimit("k", 3, 1000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("reports remaining count", () => {
    const now = 5_000;
    expect(rateLimit("k", 5, 1000, now).remaining).toBe(4);
    expect(rateLimit("k", 5, 1000, now).remaining).toBe(3);
  });

  it("resets after the window elapses", () => {
    const start = 10_000;
    rateLimit("k", 1, 1000, start);
    expect(rateLimit("k", 1, 1000, start).allowed).toBe(false); // same window
    expect(rateLimit("k", 1, 1000, start + 1001).allowed).toBe(true); // new window
  });

  it("tracks keys independently", () => {
    const now = 0;
    expect(rateLimit("a", 1, 1000, now).allowed).toBe(true);
    expect(rateLimit("b", 1, 1000, now).allowed).toBe(true);
    expect(rateLimit("a", 1, 1000, now).allowed).toBe(false);
  });
});
