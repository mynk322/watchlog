import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { review: { findMany: vi.fn() }, comment: { findMany: vi.fn() } },
}));

vi.mock("@/lib/profile", () => ({
  resolveReviewAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(
      unique.map((id) => [id, { userId: id, displayName: `Name ${id}`, handle: `h-${id}`, avatarUrl: null }])
    );
  }),
}));

vi.mock("@/lib/likes", () => ({
  resolveLikes: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, { count: 3, likedByViewer: false }]))),
}));

import { prisma } from "@/lib/prisma";
import { resolveLikes } from "@/lib/likes";
import { getPublicTitleReviews } from "./public-title";

const reviewMock = prisma.review as unknown as Record<string, Mock>;
const commentMock = prisma.comment as unknown as Record<string, Mock>;

const now = new Date("2026-07-16T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicTitleReviews", () => {
  it("returns [] for a title with no reviews (and never queries comments)", async () => {
    reviewMock.findMany.mockResolvedValue([]);
    expect(await getPublicTitleReviews(10, "MOVIE")).toEqual([]);
    expect(commentMock.findMany).not.toHaveBeenCalled();
  });

  it("assembles author, like count, and threaded comments, with no viewer-specific state", async () => {
    reviewMock.findMany.mockResolvedValue([
      { id: "r1", userId: "author1", tmdbId: 10, mediaType: "MOVIE", rating: 4, body: "great", createdAt: now, updatedAt: now },
    ]);
    commentMock.findMany.mockResolvedValue([
      { id: "c1", reviewId: "r1", userId: "cmt1", body: "agreed", createdAt: now, updatedAt: now },
    ]);

    const out = await getPublicTitleReviews(10, "MOVIE");

    expect(resolveLikes).toHaveBeenCalledWith(["r1"], null); // read-only: no viewer
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "r1",
      author: { displayName: "Name author1", handle: "h-author1", avatarUrl: null },
      rating: 4,
      body: "great",
      likeCount: 3,
    });
    expect(out[0].comments).toHaveLength(1);
    expect(out[0].comments[0]).toMatchObject({ body: "agreed", author: { handle: "h-cmt1" } });
    // Nothing viewer-specific leaks into the public payload.
    expect(out[0]).not.toHaveProperty("isOwn");
    expect(out[0]).not.toHaveProperty("likedByViewer");
    expect(out[0].author).not.toHaveProperty("userId");
  });
});
