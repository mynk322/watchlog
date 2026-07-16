import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trendingItem: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/lib/tmdb", () => ({ getTrending: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getTrending } from "@/lib/tmdb";
import { getTrendingItems } from "./trending";

const trendingMock = prisma.trendingItem as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTrendingItems", () => {
  it("returns the cache without hitting TMDB when it's populated", async () => {
    trendingMock.findMany.mockResolvedValue([{ tmdbId: 1, mediaType: "MOVIE", title: "A" }]);
    const items = await getTrendingItems();
    expect(items).toHaveLength(1);
    expect(getTrending).not.toHaveBeenCalled();
  });

  it("populates from TMDB when the cache is empty", async () => {
    trendingMock.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ tmdbId: 2, mediaType: "TV", title: "B" }]);
    (getTrending as Mock).mockResolvedValue([
      { tmdbId: 2, mediaType: "tv", title: "B", releaseYear: 2020, posterUrl: null, backdropUrl: null, overview: "", voteAverage: 8 },
    ]);
    const items = await getTrendingItems();
    expect(getTrending).toHaveBeenCalledWith("week");
    expect(items).toHaveLength(1);
  });

  it("returns [] when TMDB is unreachable and the cache is empty", async () => {
    trendingMock.findMany.mockResolvedValue([]);
    (getTrending as Mock).mockRejectedValue(new Error("TMDB down"));
    expect(await getTrendingItems()).toEqual([]);
  });
});
