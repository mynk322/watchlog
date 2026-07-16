import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { rateLimit: { upsert: vi.fn(), deleteMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { rateLimit, cleanupRateLimits } from "./rate-limit";

const rlMock = prisma.rateLimit as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rateLimit", () => {
  it("allows while the window count is within the limit", async () => {
    rlMock.upsert.mockResolvedValue({ count: 3 });
    const res = await rateLimit("search:ip", 3, 1000, 5500);
    expect(res).toEqual({ allowed: true, remaining: 0, resetAt: 6000 });
  });

  it("blocks once the count exceeds the limit", async () => {
    rlMock.upsert.mockResolvedValue({ count: 4 });
    const res = await rateLimit("search:ip", 3, 1000, 5500);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it("keys the counter by subject + window start and sets the expiry", async () => {
    rlMock.upsert.mockResolvedValue({ count: 1 });
    await rateLimit("search:1.2.3.4", 10, 1000, 5500); // window start = 5000
    expect(rlMock.upsert).toHaveBeenCalledWith({
      where: { key: "search:1.2.3.4:5000" },
      create: { key: "search:1.2.3.4:5000", count: 1, expiresAt: new Date(6000) },
      update: { count: { increment: 1 } },
    });
  });

  it("fails open when the counter store errors", async () => {
    rlMock.upsert.mockRejectedValue(new Error("db down"));
    const res = await rateLimit("search:ip", 3, 1000, 5500);
    expect(res.allowed).toBe(true);
  });
});

describe("cleanupRateLimits", () => {
  it("deletes rows whose window has expired", async () => {
    rlMock.deleteMany.mockResolvedValue({ count: 2 });
    await cleanupRateLimits(9000);
    expect(rlMock.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: new Date(9000) } } });
  });
});
