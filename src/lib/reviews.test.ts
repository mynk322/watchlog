import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follow: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
    title: { findMany: vi.fn() },
    profile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/profile", () => ({
  resolveReviewAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(
      unique.map((id) => [id, { userId: id, displayName: `Name ${id}`, handle: `handle-${id}`, avatarUrl: null }])
    );
  }),
  resolveAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(unique.map((id) => [id, { displayName: `Name ${id}`, handle: `handle-${id}` }]));
  }),
}));

// Like resolution is exercised in likes.test.ts; here it's an empty map so DTOs fall back to zero likes.
vi.mock("@/lib/likes", () => ({ resolveLikes: vi.fn(async () => new Map()) }));

import { prisma } from "@/lib/prisma";
import { getFeedReviews, getProfilePage, getPublicReviewsForTitle, getRecentPublicReviews } from "./reviews";

const followMock = prisma.follow as unknown as Record<string, Mock>;
const reviewMock = prisma.review as unknown as Record<string, Mock>;
const titleMock = prisma.title as unknown as Record<string, Mock>;
const profileMock = prisma.profile as unknown as Record<string, Mock>;

function makeReview(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-07-16T12:00:00.000Z");
  return {
    id: "r1",
    userId: "authorA",
    tmdbId: 10,
    mediaType: "MOVIE",
    rating: 4,
    body: "great",
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFeedReviews", () => {
  it("returns [] and skips the review query when the viewer follows no one", async () => {
    followMock.findMany.mockResolvedValue([]);
    const feed = await getFeedReviews("viewer");
    expect(feed).toEqual([]);
    expect(reviewMock.findMany).not.toHaveBeenCalled();
  });

  it("resolves author, prefers a title row with a poster, and sets viewerTitleId only for the viewer's own row", async () => {
    followMock.findMany.mockResolvedValue([{ followingId: "authorA" }]);
    reviewMock.findMany.mockResolvedValue([makeReview()]);
    // Null-poster row comes first to exercise the "upgrade to the row that has a poster" branch.
    titleMock.findMany.mockResolvedValue([
      { id: "t-other", userId: "someoneElse", tmdbId: 10, mediaType: "MOVIE", title: "Movie 10", releaseYear: 2010, posterUrl: null },
      { id: "t-viewer", userId: "viewer", tmdbId: 10, mediaType: "MOVIE", title: "Movie 10", releaseYear: 2010, posterUrl: "/p10.jpg" },
    ]);

    const feed = await getFeedReviews("viewer");
    expect(feed).toHaveLength(1);
    expect(feed[0].author.handle).toBe("handle-authorA");
    expect(feed[0].title).toMatchObject({
      title: "Movie 10",
      releaseYear: 2010,
      posterUrl: "/p10.jpg",
      viewerTitleId: "t-viewer",
    });
  });

  it("degrades to 'Title unavailable' for a review whose title has no surviving row", async () => {
    followMock.findMany.mockResolvedValue([{ followingId: "authorA" }]);
    reviewMock.findMany.mockResolvedValue([makeReview({ tmdbId: 99, mediaType: "TV" })]);
    titleMock.findMany.mockResolvedValue([]); // orphaned review — every holder removed the title

    const feed = await getFeedReviews("viewer");
    expect(feed[0].title).toMatchObject({ title: "Title unavailable", posterUrl: null, viewerTitleId: null });
  });
});

describe("getProfilePage", () => {
  it("returns null for an unknown handle", async () => {
    profileMock.findUnique.mockResolvedValue(null);
    expect(await getProfilePage("ghost", "viewer")).toBeNull();
  });

  it("returns the profile identity and its review count", async () => {
    profileMock.findUnique.mockResolvedValue({ userId: "authorA", displayName: "A", handle: "author-a" });
    reviewMock.findMany.mockResolvedValue([makeReview(), makeReview({ id: "r2", tmdbId: 11 })]);
    titleMock.findMany.mockResolvedValue([]);

    const page = await getProfilePage("author-a", "viewer");
    expect(page).not.toBeNull();
    // Both seeded reviews carry rating 4; likes are mocked empty, so avg 4.0 and 0 likes received.
    expect(page!.profile).toMatchObject({
      userId: "authorA",
      handle: "handle-authorA",
      reviewCount: 2,
      avgRating: 4,
      likesReceived: 0,
    });
    expect(page!.reviews).toHaveLength(2);
  });
});

describe("getPublicReviewsForTitle", () => {
  it("returns review content with no author identity or viewer state (no PII)", async () => {
    reviewMock.findMany.mockResolvedValue([makeReview({ userId: "secret-clerk-id" })]);

    const out = await getPublicReviewsForTitle(10, "MOVIE");

    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: "r1",
      rating: 4,
      body: "great",
      createdAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:00.000Z",
    });
    // The whole point of the public DTO: nothing identifying leaks to the client.
    expect(out[0]).not.toHaveProperty("author");
    expect(out[0]).not.toHaveProperty("userId");
    expect(out[0]).not.toHaveProperty("isOwn");
    expect(JSON.stringify(out)).not.toContain("secret-clerk-id");
  });

  it("queries globally by tmdbId+mediaType, newest first", async () => {
    reviewMock.findMany.mockResolvedValue([]);
    await getPublicReviewsForTitle(55, "TV");
    expect(reviewMock.findMany).toHaveBeenCalledWith({
      where: { tmdbId: 55, mediaType: "TV" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getRecentPublicReviews", () => {
  it("resolves title metadata + a linkable title id and public author identity", async () => {
    reviewMock.findMany.mockResolvedValue([makeReview({ id: "r1", userId: "authorA", tmdbId: 10, mediaType: "MOVIE" })]);
    titleMock.findMany.mockResolvedValue([
      { id: "t-10", tmdbId: 10, mediaType: "MOVIE", title: "Movie 10", releaseYear: 2010, posterUrl: "/p.jpg" },
    ]);
    const out = await getRecentPublicReviews(5);
    expect(out[0]).toMatchObject({
      id: "r1",
      author: { handle: "handle-authorA" },
      title: { title: "Movie 10", titleId: "t-10", posterUrl: "/p.jpg" },
    });
    expect(out[0].author).not.toHaveProperty("userId"); // no PII beyond public name/handle
  });

  it("skips reviews whose author has no public profile", async () => {
    const profile = await import("./profile");
    (profile.resolveAuthors as unknown as Mock).mockResolvedValueOnce(new Map());
    reviewMock.findMany.mockResolvedValue([makeReview({ id: "r2", userId: "ghost" })]);
    titleMock.findMany.mockResolvedValue([]);
    expect(await getRecentPublicReviews(5)).toEqual([]);
  });
});
