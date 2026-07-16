import "server-only";
import type { TrendingItemModel } from "@/generated/prisma/models";
import { prisma } from "./prisma";
import { getTrending } from "./tmdb";

// Keep a deep-ish trending pool: it's both the "Discover" source and the fallback / top-up pool for
// recommendations, which needs to be far larger than one page so the row isn't capped at ~20.
const TRENDING_POOL_SIZE = 100;
const TRENDING_PAGES = 5;

async function populateTrendingCache(): Promise<void> {
  const trending = await getTrending("week", TRENDING_PAGES);
  const rows = trending.slice(0, TRENDING_POOL_SIZE).map((t) => ({
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
  // Repopulate when empty OR still holding the old small (24-item) cache, so the deeper pool takes
  // effect without waiting for the next cron run.
  if (items.length < TRENDING_POOL_SIZE / 2) {
    try {
      await populateTrendingCache();
      items = await prisma.trendingItem.findMany({ orderBy: { voteAverage: "desc" } });
    } catch {
      return items; // keep whatever we already had on TMDB failure
    }
  }
  return items;
}
