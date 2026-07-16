import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchTitles } from "@/lib/tmdb";
import { parseYear } from "@/lib/tmdb-shared";
import type { SearchResultDTO } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Public: logged-out visitors can search too. When signed in we also annotate which results are
  // already in their collection; for a guest there's nothing to annotate (the browser ghost store
  // tracks that client-side instead).
  const { userId } = await auth();

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return Response.json({ results: [] });
  }

  const year = parseYear(request.nextUrl.searchParams.get("year"));

  const results = (await searchTitles(q, { year })).slice(0, 20);
  if (results.length === 0) {
    return Response.json({ results: [] });
  }

  const existing = userId
    ? await prisma.title.findMany({
        where: {
          userId,
          OR: results.map((r) => ({
            tmdbId: r.tmdbId,
            mediaType: r.mediaType === "tv" ? "TV" : "MOVIE",
          })),
        },
        select: { tmdbId: true, mediaType: true, status: true },
      })
    : [];
  const existingMap = new Map(existing.map((e) => [`${e.tmdbId}-${e.mediaType}`, e.status]));

  const dto: SearchResultDTO[] = results.map((r) => {
    const mediaType = r.mediaType === "tv" ? "TV" : "MOVIE";
    return {
      tmdbId: r.tmdbId,
      mediaType,
      title: r.title,
      releaseYear: r.releaseYear,
      posterUrl: r.posterUrl,
      backdropUrl: r.backdropUrl,
      overview: r.overview,
      voteAverage: r.voteAverage,
      popularity: r.popularity,
      alreadyAdded: existingMap.get(`${r.tmdbId}-${mediaType}`) ?? null,
    };
  });

  return Response.json({ results: dto });
}
