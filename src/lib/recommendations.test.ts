import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { title: { findMany: vi.fn() } } }));
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
  const ownerTitle = (over = {}) => ({
    id: "t?",
    tmdbId: 1,
    mediaType: "MOVIE",
    title: "A",
    posterUrl: null,
    releaseYear: 2020,
    rating: 5,
    genres: [],
    ...over,
  });

  it("returns [] for your own profile without querying", async () => {
    expect(await getProfileRecommendations("me", "me")).toEqual([]);
    expect(titleMock.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when the owner has rated nothing", async () => {
    titleMock.findMany.mockResolvedValueOnce([]); // owner titles
    expect(await getProfileRecommendations("owner", "viewer")).toEqual([]);
  });

  it("ranks the owner's highly-rated titles, boosting genres the viewer likes, excluding owned", async () => {
    // Owner rated two 5-star titles: a Drama and a Comedy.
    titleMock.findMany.mockResolvedValueOnce([
      ownerTitle({ id: "drama", tmdbId: 1, title: "Drama Pick", rating: 5, genres: ["Drama"] }),
      ownerTitle({ id: "comedy", tmdbId: 2, title: "Comedy Pick", rating: 5, genres: ["Comedy"] }),
      ownerTitle({ id: "seen", tmdbId: 3, title: "Already Seen", rating: 5, genres: ["Drama"] }),
    ]);
    // Viewer loves Comedy and already has title 3.
    titleMock.findMany.mockResolvedValueOnce([
      { tmdbId: 9, mediaType: "MOVIE", status: "WATCHED", rating: 5, genres: ["Comedy"] },
      { tmdbId: 3, mediaType: "MOVIE", status: "WATCHED", rating: 4, genres: ["Drama"] },
    ]);

    const recs = await getProfileRecommendations("owner", "viewer");
    expect(recs.map((r) => r.titleId)).toEqual(["comedy", "drama"]); // Comedy boosted above Drama
    expect(recs.map((r) => r.tmdbId)).not.toContain(3); // viewer already has it → excluded
    expect(recs[0]).toMatchObject({ titleId: "comedy", ownerRating: 5 });
  });

  it("ranks purely by the owner's rating for a logged-out viewer (no viewer query)", async () => {
    titleMock.findMany.mockResolvedValueOnce([
      ownerTitle({ id: "hi", tmdbId: 1, rating: 5, genres: ["Drama"] }),
      ownerTitle({ id: "lo", tmdbId: 2, rating: 3, genres: ["Comedy"] }),
    ]);
    const recs = await getProfileRecommendations("owner", null);
    expect(recs.map((r) => r.titleId)).toEqual(["hi", "lo"]);
    expect(titleMock.findMany).toHaveBeenCalledTimes(1); // no viewer-taste query
  });
});
