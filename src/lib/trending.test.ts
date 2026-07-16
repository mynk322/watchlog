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
  it("returns the cache without hitting TMDB when it's sufficiently populated", async () => {
    // The deep pool only counts as populated at >= half of TRENDING_POOL_SIZE (100), so seed 100.
    const cached = Array.from({ length: 100 }, (_, i) => ({ tmdbId: i + 1, mediaType: "MOVIE", title: `A${i}` }));
    trendingMock.findMany.mockResolvedValue(cached);
    const items = await getTrendingItems();
    expect(items).toHaveLength(100);
    expect(getTrending).not.toHaveBeenCalled();
  });

  it("populates from TMDB when the cache is empty (or holding the old small pool)", async () => {
    trendingMock.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ tmdbId: 2, mediaType: "TV", title: "B" }]);
    (getTrending as Mock).mockResolvedValue([
      { tmdbId: 2, mediaType: "tv", title: "B", releaseYear: 2020, posterUrl: null, backdropUrl: null, overview: "", voteAverage: 8 },
    ]);
    const items = await getTrendingItems();
    expect(getTrending).toHaveBeenCalledWith("week", 5);
    expect(items).toHaveLength(1);
  });

  it("returns [] when TMDB is unreachable and the cache is empty", async () => {
    trendingMock.findMany.mockResolvedValue([]);
    (getTrending as Mock).mockRejectedValue(new Error("TMDB down"));
    expect(await getTrendingItems()).toEqual([]);
  });
});
