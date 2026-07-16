import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { title: { findMany: vi.fn() }, review: { findMany: vi.fn() } } }));
vi.mock("@/lib/tmdb", () => ({ getRecommendations: vi.fn() }));
vi.mock("@/lib/trending", () => ({ getTrendingItems: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getRecommendations } from "@/lib/tmdb";
import { getTrendingItems } from "@/lib/trending";
import { getRecommendationsForUser, getProfileRecommendations } from "./recommendations";

const titleMock = prisma.title as unknown as Record<string, Mock>;
const recMock = getRecommendations as unknown as Mock;
const trendingMock = getTrendingItems as unknown as Mock;

// A TMDB list item (mediaType is TMDB-style "movie"/"tv").
const rec = (tmdbId: number) => ({
  tmdbId,
  mediaType: "movie" as const,
  title: `M${tmdbId}`,
  releaseYear: 2020,
  releaseDate: null,
  posterUrl: null,
  backdropUrl: null,
  overview: "",
  voteAverage: 7,
  popularity: 1,
});

const owned = (tmdbId: number, over: Record<string, unknown> = {}) => ({
  tmdbId,
  mediaType: "MOVIE" as const,
  status: "WATCHED" as const,
  rating: 5,
  watchedAt: new Date("2026-07-16T00:00:00Z"),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRecommendationsForUser", () => {
  it("falls back to trending (not personalized) when the user has no watched titles", async () => {
    titleMock.findMany.mockResolvedValue([owned(1, { status: "WATCHLIST" })]);
    trendingMock.mockResolvedValue([
      { tmdbId: 9, mediaType: "MOVIE", title: "Trend", releaseYear: 2021, posterUrl: null, backdropUrl: null, overview: "", voteAverage: 8 },
    ]);

    const res = await getRecommendationsForUser("new-user");
    expect(res.personalized).toBe(false);
    expect(res.items.map((i) => i.tmdbId)).toEqual([9]);
    expect(recMock).not.toHaveBeenCalled();
  });

  it("ranks a title recommended by multiple seeds highest, and excludes owned titles", async () => {
    titleMock.findMany.mockResolvedValue([owned(10, { rating: 5 }), owned(11, { rating: 4 })]);
    recMock.mockImplementation(async (tmdbId: number) => {
      if (tmdbId === 10) return [rec(100), rec(200), rec(11)]; // 11 is owned → must be dropped
      if (tmdbId === 11) return [rec(100), rec(300)];
      return [];
    });

    const res = await getRecommendationsForUser("user-a");
    expect(res.personalized).toBe(true);
    const ids = res.items.map((i) => i.tmdbId);
    expect(ids[0]).toBe(100); // recommended by both seeds → top
    expect(ids).toContain(200);
    expect(ids).toContain(300);
    expect(ids).not.toContain(11); // owned excluded
    expect(ids).not.toContain(10);
    expect(res.items[0]).toMatchObject({ mediaType: "MOVIE", alreadyAdded: null });
  });

  it("falls back to trending when TMDB returns no recommendations", async () => {
    titleMock.findMany.mockResolvedValue([owned(10)]);
    recMock.mockResolvedValue([]);
    trendingMock.mockResolvedValue([
      { tmdbId: 5, mediaType: "TV", title: "Fallback", releaseYear: 2019, posterUrl: null, backdropUrl: null, overview: "", voteAverage: 6 },
    ]);

    const res = await getRecommendationsForUser("user-b");
    expect(res.personalized).toBe(false);
    expect(res.items.map((i) => i.tmdbId)).toEqual([5]);
  });
});

describe("getProfileRecommendations", () => {
  const reviewMock = (prisma as unknown as { review: Record<string, Mock> }).review;
  const titleMeta = (id: string, tmdbId: number, genres: string[], title = `T${tmdbId}`) => ({
    id,
    tmdbId,
    mediaType: "MOVIE",
    title,
    posterUrl: `/${id}.jpg`,
    releaseYear: 2020,
    genres,
  });

  it("returns [] for your own profile without querying", async () => {
    expect(await getProfileRecommendations("me", "me")).toEqual([]);
    expect(reviewMock.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when the owner has no rated reviews", async () => {
    reviewMock.findMany.mockResolvedValueOnce([]); // owner reviews (rating not null)
    expect(await getProfileRecommendations("owner", "viewer")).toEqual([]);
  });

  it("recommends from the owner's rated reviews, boosting genres the viewer likes, excluding owned", async () => {
    // Owner publicly reviewed three titles with 5 stars.
    reviewMock.findMany.mockResolvedValueOnce([
      { tmdbId: 1, mediaType: "MOVIE", rating: 5 },
      { tmdbId: 2, mediaType: "MOVIE", rating: 5 },
      { tmdbId: 3, mediaType: "MOVIE", rating: 5 },
    ]);
    // Viewer loves Comedy and already has title 3.
    titleMock.findMany.mockResolvedValueOnce([
      { tmdbId: 9, mediaType: "MOVIE", status: "WATCHED", rating: 5, genres: ["Comedy"] },
      { tmdbId: 3, mediaType: "MOVIE", status: "WATCHED", rating: 4, genres: ["Drama"] },
    ]);
    // Title metadata for the remaining candidates (1 = Drama, 2 = Comedy).
    titleMock.findMany.mockResolvedValueOnce([
      titleMeta("drama", 1, ["Drama"], "Drama Pick"),
      titleMeta("comedy", 2, ["Comedy"], "Comedy Pick"),
    ]);

    const recs = await getProfileRecommendations("owner", "viewer");
    expect(recs.map((r) => r.titleId)).toEqual(["comedy", "drama"]); // Comedy boosted above Drama
    expect(recs.map((r) => r.tmdbId)).not.toContain(3); // viewer already has it → excluded
    expect(recs[0]).toMatchObject({ titleId: "comedy", ownerRating: 5, title: "Comedy Pick" });
  });

  it("skips a reviewed title with no surviving Title row (nothing to show/link)", async () => {
    reviewMock.findMany.mockResolvedValueOnce([{ tmdbId: 7, mediaType: "MOVIE", rating: 5 }]);
    titleMock.findMany.mockResolvedValueOnce([]); // no metadata rows anywhere
    expect(await getProfileRecommendations("owner", null)).toEqual([]);
  });

  it("ranks purely by the owner's review rating for a logged-out viewer (no viewer-taste query)", async () => {
    reviewMock.findMany.mockResolvedValueOnce([
      { tmdbId: 1, mediaType: "MOVIE", rating: 5 },
      { tmdbId: 2, mediaType: "MOVIE", rating: 3 },
    ]);
    titleMock.findMany.mockResolvedValueOnce([titleMeta("hi", 1, ["Drama"]), titleMeta("lo", 2, ["Comedy"])]);
    const recs = await getProfileRecommendations("owner", null);
    expect(recs.map((r) => r.titleId)).toEqual(["hi", "lo"]);
    expect(titleMock.findMany).toHaveBeenCalledTimes(1); // only the metadata query, no viewer query
  });
});
