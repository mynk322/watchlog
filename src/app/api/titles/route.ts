import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDetails, getCredits } from "@/lib/tmdb";
import { toTitleDTO, toTmdbMediaType } from "@/lib/dto";
import type { MediaType, TitleStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];
const VALID_STATUSES: TitleStatus[] = ["WATCHED", "WATCHLIST"];

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status") as TitleStatus | null;
  if (!status || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "status must be WATCHED or WATCHLIST" }, { status: 400 });
  }

  const titles = await prisma.title.findMany({
    where: { status, userId },
    orderBy: [{ releaseYear: "desc" }, { title: "asc" }],
  });

  return Response.json({ titles: titles.map(toTitleDTO) });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  const status = body?.status as TitleStatus;

  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType) || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "tmdbId, mediaType, and status are required" }, { status: 400 });
  }

  let details;
  try {
    details = await getDetails(tmdbId, toTmdbMediaType(mediaType));
  } catch {
    return Response.json({ error: "Could not fetch title details from TMDB" }, { status: 502 });
  }

  // Cast & crew are static once released — fetched once here (and by the cron backfill for
  // pre-existing rows), never re-fetched.
  const credits = await getCredits(tmdbId, toTmdbMediaType(mediaType));
  const directors = mediaType === "TV" ? details.creators : credits.directors;

  const title = await prisma.title.upsert({
    where: { tmdbId_mediaType_userId: { tmdbId, mediaType, userId } },
    create: {
      userId,
      tmdbId,
      mediaType,
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
      topCast: credits.cast as unknown as object,
      directors: directors as unknown as object,
      status,
      watchedAt: status === "WATCHED" ? new Date() : null,
    },
    update: {
      status,
      watchedAt: status === "WATCHED" ? new Date() : null,
      seasonEpisodeCounts: details.seasonEpisodeCounts,
      topCast: credits.cast as unknown as object,
      directors: directors as unknown as object,
    },
  });

  return Response.json({ title: toTitleDTO(title) }, { status: 201 });
}
