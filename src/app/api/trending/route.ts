import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getTrendingItems } from "@/lib/trending";
import type { TrendingDTO } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getTrendingItems();

  const existing = await prisma.title.findMany({
    where: { userId, OR: items.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })) },
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
