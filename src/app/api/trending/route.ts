import { prisma } from "@/lib/prisma";
import { getTrending } from "@/lib/tmdb";
import type { TrendingDTO } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function populateTrendingCache() {
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

export async function GET() {
  let items = await prisma.trendingItem.findMany({ orderBy: { voteAverage: "desc" } });

  // First load before any cron run has populated the cache yet: fetch live so the
  // Discover row isn't empty for up to 6 hours.
  if (items.length === 0) {
    try {
      await populateTrendingCache();
      items = await prisma.trendingItem.findMany({ orderBy: { voteAverage: "desc" } });
    } catch {
      return Response.json({ items: [] });
    }
  }

  const existing = await prisma.title.findMany({
    where: { OR: items.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })) },
    select: { tmdbId: true, mediaType: true, status: true },
  });
  const existingMap = new Map(existing.map((e) => [`${e.tmdbId}-${e.mediaType}`, e.status]));

  const dto: TrendingDTO[] = items.map((i) => ({
    tmdbId: i.tmdbId,
    mediaType: i.mediaType,
    title: i.title,
    releaseYear: i.releaseYear,
    posterUrl: i.posterUrl,
    backdropUrl: i.backdropUrl,
    overview: i.overview ?? "",
    voteAverage: i.voteAverage ?? 0,
    alreadyAdded: existingMap.get(`${i.tmdbId}-${i.mediaType}`) ?? null,
  }));

  return Response.json({ items: dto });
}
