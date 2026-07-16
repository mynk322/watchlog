import "server-only";
import type { TrendingItemModel } from "@/generated/prisma/models";
import { prisma } from "./prisma";
import { getTrending } from "./tmdb";

async function populateTrendingCache(): Promise<void> {
  const trending = await getTrending("week");
  const rows = trending.slice(0, 24).map((t) => ({
    tmdbId: t.tmdbId,
    mediaType: t.mediaType === "tv" ? ("TV" as const) : ("MOVIE" as const),
    title: t.title,
    releaseYear: t.releaseYear,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    overview: t.overview,
    voteAverage: t.voteAverage,
  }));
  await prisma.$transaction([
    prisma.trendingItem.deleteMany({}),
    ...(rows.length > 0 ? [prisma.trendingItem.createMany({ data: rows })] : []),
  ]);
}

/**
 * Trending titles, highest-rated first. Served from the cache (refreshed by cron); if the cache is
 * empty (e.g. before the first cron run) it's populated live so the row is never empty. Returns []
 * if TMDB is unreachable.
 */
export async function getTrendingItems(): Promise<TrendingItemModel[]> {
  let items = await prisma.trendingItem.findMany({ orderBy: { voteAverage: "desc" } });
  if (items.length === 0) {
    try {
      await populateTrendingCache();
      items = await prisma.trendingItem.findMany({ orderBy: { voteAverage: "desc" } });
    } catch {
      return [];
    }
  }
  return items;
}
