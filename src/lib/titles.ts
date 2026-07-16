import "server-only";
import { prisma } from "./prisma";
import { getDetails, getCredits } from "./tmdb";
import { toTmdbMediaType } from "./dto";
import type { TitleModel } from "@/generated/prisma/models";
import type { MediaType, TitleStatus } from "./types";

export interface UpsertTitleInput {
  tmdbId: number;
  mediaType: MediaType;
  status: TitleStatus;
}

/**
 * Enriches a title from TMDB and upserts it into the user's collection, keyed by
 * (tmdbId, mediaType, userId). Shared by the single-add POST and the ghost-watchlist merge.
 *
 * When `keepExistingStatusOnConflict` is true (merge), an already-present title keeps its current
 * status/rating — we only refresh static metadata — so replaying a ghost WATCHLIST item can never
 * downgrade a title the user has since marked WATCHED. Throws if TMDB details can't be fetched.
 */
export async function upsertTitleForUser(
  userId: string,
  { tmdbId, mediaType, status }: UpsertTitleInput,
  { keepExistingStatusOnConflict = false }: { keepExistingStatusOnConflict?: boolean } = {}
): Promise<TitleModel> {
  const details = await getDetails(tmdbId, toTmdbMediaType(mediaType));

  // Cast & crew are static once released — fetched once here (and by the cron backfill for
  // pre-existing rows), never re-fetched.
  const credits = await getCredits(tmdbId, toTmdbMediaType(mediaType));
  const directors = mediaType === "TV" ? details.creators : credits.directors;

  const staticMeta = {
    seasonEpisodeCounts: details.seasonEpisodeCounts,
    topCast: credits.cast as unknown as object,
    directors: directors as unknown as object,
  };

  return prisma.title.upsert({
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
      ...staticMeta,
      status,
      watchedAt: status === "WATCHED" ? new Date() : null,
    },
    update: keepExistingStatusOnConflict
      ? staticMeta
      : { ...staticMeta, status, watchedAt: status === "WATCHED" ? new Date() : null },
  });
}
