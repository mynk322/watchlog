import "server-only";
import { prisma } from "./prisma";
import { getDetails, getCredits } from "./tmdb";
import { toTmdbMediaType } from "./dto";
import { parseTitleRef } from "./tmdb-shared";
import type { MediaType } from "./types";

/**
 * The public, TMDB-sourced metadata the title detail page renders. Every field originates from TMDB,
 * so it can come from a stored Title row OR be fetched live for a title no one has added yet.
 * `id` is the value to use in a canonical /t/[id] link (a real Title row cuid when one exists,
 * otherwise the tmdb ref that resolved this title).
 */
export interface BaseTitle {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  genres: string[];
  voteAverage: number | null;
  runtime: number | null;
  watchUrl: string | null;
  topCast: unknown;
  directors: unknown;
}

function fromRow(row: {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  genres: string[];
  voteAverage: number | null;
  runtime: number | null;
  watchUrl: string | null;
  topCast: unknown;
  directors: unknown;
}): BaseTitle {
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    mediaType: row.mediaType,
    title: row.title,
    releaseYear: row.releaseYear,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    overview: row.overview,
    genres: row.genres,
    voteAverage: row.voteAverage,
    runtime: row.runtime,
    watchUrl: row.watchUrl,
    topCast: row.topCast,
    directors: row.directors,
  };
}

/** Build a base title straight from TMDB for a title no user has stored. Returns null if TMDB has no
 *  such title (e.g. a bad id in the URL), so the page can 404. */
async function fromTmdb(ref: string, tmdbId: number, mediaType: MediaType): Promise<BaseTitle | null> {
  try {
    const tmdbMediaType = toTmdbMediaType(mediaType);
    const [details, credits] = await Promise.all([
      getDetails(tmdbId, tmdbMediaType),
      getCredits(tmdbId, tmdbMediaType),
    ]);
    return {
      id: ref,
      tmdbId,
      mediaType,
      title: details.title,
      releaseYear: details.releaseYear,
      posterUrl: details.posterUrl,
      backdropUrl: details.backdropUrl,
      overview: details.overview,
      genres: details.genres,
      voteAverage: details.voteAverage,
      runtime: details.runtime,
      watchUrl: details.watchUrl,
      topCast: credits.cast,
      directors: mediaType === "TV" ? details.creators : credits.directors,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the base title for a /t/[id] param. `id` is either a Title row cuid (a shared link to one
 * user's row) or a "tmdb-<type>-<id>" ref (a link from search/discover to a title that may have no
 * row yet). For a tmdb ref we reuse any user's stored row for that title when one exists — its
 * metadata is identical and it gives a canonical id — otherwise we fetch it live from TMDB.
 * Returns null when nothing matches, so the page can 404.
 */
export async function resolveBaseTitle(id: string): Promise<BaseTitle | null> {
  const ref = parseTitleRef(id);
  if (!ref) {
    const row = await prisma.title.findUnique({ where: { id } });
    return row ? fromRow(row) : null;
  }

  const existing = await prisma.title.findFirst({
    where: { tmdbId: ref.tmdbId, mediaType: ref.mediaType },
  });
  if (existing) return fromRow(existing);

  return fromTmdb(id, ref.tmdbId, ref.mediaType);
}
