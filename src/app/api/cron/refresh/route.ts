import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDetails, getCredits, getTrending } from "@/lib/tmdb";
import { toTmdbMediaType } from "@/lib/dto";
import { cleanupRateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs `worker` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function refreshExistingTitles() {
  const titles = await prisma.title.findMany({
    select: { id: true, tmdbId: true, mediaType: true, topCast: true },
  });

  let refreshed = 0;
  let failed = 0;
  let creditsBackfilled = 0;
  await mapWithConcurrency(titles, 5, async (t) => {
    try {
      const mediaType = toTmdbMediaType(t.mediaType);
      const details = await getDetails(t.tmdbId, mediaType);

      // Cast & crew are static once released — only backfill rows that never got them (e.g.
      // added before this feature existed), never re-fetch rows that already have it.
      let creditsUpdate: { topCast: object; directors: object } | null = null;
      if (t.topCast === null) {
        const credits = await getCredits(t.tmdbId, mediaType);
        const directors = t.mediaType === "TV" ? details.creators : credits.directors;
        creditsUpdate = {
          topCast: credits.cast as unknown as object,
          directors: directors as unknown as object,
        };
        creditsBackfilled++;
      }

      await prisma.title.update({
        where: { id: t.id },
        data: {
          title: details.title,
          releaseYear: details.releaseYear,
          releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
          posterUrl: details.posterUrl,
          backdropUrl: details.backdropUrl,
          overview: details.overview,
          genres: details.genres,
          voteAverage: details.voteAverage,
          runtime: details.runtime,
          watchUrl: details.watchUrl,
          totalSeasons: details.numberOfSeasons,
          seasonEpisodeCounts: details.seasonEpisodeCounts,
          ...creditsUpdate,
        },
      });
      refreshed++;
    } catch (err) {
      failed++;
      console.error(`[cron/refresh] failed to refresh title ${t.tmdbId}`, err);
    }
  });

  return { refreshed, failed, total: titles.length, creditsBackfilled };
}

async function refreshTrendingCache() {
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
  return { trendingCount: rows.length };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [titlesResult, trendingResult] = await Promise.all([
    refreshExistingTitles(),
    refreshTrendingCache(),
    cleanupRateLimits(), // drop expired rate-limit counter rows
  ]);

  return Response.json({ ok: true, titles: titlesResult, trending: trendingResult });
}
