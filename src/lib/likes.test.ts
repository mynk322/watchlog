import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewLike: {
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { likeReview, unlikeReview, deleteLikesForReview, resolveLikes } from "./likes";

const likeMock = prisma.reviewLike as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("likeReview", () => {
  it("upserts so a double-like can't error", async () => {
    likeMock.upsert.mockResolvedValue({});
    await likeReview("u1", "r1");
    expect(likeMock.upsert).toHaveBeenCalledWith({
      where: { userId_reviewId: { userId: "u1", reviewId: "r1" } },
      create: { userId: "u1", reviewId: "r1" },
      update: {},
    });
  });
});

describe("unlikeReview", () => {
  it("swallows the error when the like doesn't exist", async () => {
    likeMock.delete.mockRejectedValue(new Error("Record to delete does not exist"));
    await expect(unlikeReview("u1", "r1")).resolves.toBeUndefined();
  });
});

describe("deleteLikesForReview", () => {
  it("removes every like for the review", async () => {
    likeMock.deleteMany.mockResolvedValue({ count: 3 });
    await deleteLikesForReview("r1");
    expect(likeMock.deleteMany).toHaveBeenCalledWith({ where: { reviewId: "r1" } });
  });
});

describe("resolveLikes", () => {
  it("returns an empty map (and runs no query) for no reviews", async () => {
    const map = await resolveLikes([], "viewer");
    expect(map.size).toBe(0);
    expect(likeMock.groupBy).not.toHaveBeenCalled();
  });

  it("merges counts with the viewer's liked state, defaulting unliked reviews to zero", async () => {
    likeMock.groupBy.mockResolvedValue([{ reviewId: "r1", _count: { reviewId: 4 } }]);
    likeMock.findMany.mockResolvedValue([{ reviewId: "r1" }]); // viewer liked r1 only

    const map = await resolveLikes(["r1", "r2"], "viewer");
    expect(map.get("r1")).toEqual({ count: 4, likedByViewer: true });
    expect(map.get("r2")).toEqual({ count: 0, likedByViewer: false });
  });
});
