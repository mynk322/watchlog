import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { title: { findMany: vi.fn() } } }));
vi.mock("@/lib/tmdb", () => ({ getRecommendations: vi.fn() }));
vi.mock("@/lib/trending", () => ({ getTrendingItems: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getRecommendations } from "@/lib/tmdb";
import { getTrendingItems } from "@/lib/trending";
import { getRecommendationsForUser } from "./recommendations";

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
