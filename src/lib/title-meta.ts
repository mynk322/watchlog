import "server-only";
import { prisma } from "./prisma";
import { getDetails } from "./tmdb";
import { toTmdbMediaType } from "./dto";
import type { MediaType } from "./types";

export interface TitleMeta {
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
}

/**
 * Snapshot display metadata for a title. Prefers any existing Title row that has a poster (so the
 * snapshot isn't blank), then any Title row, and only falls back to a TMDB fetch when no user has
 * this title. Used when copying a title into a list item or a suggestion.
 */
export async function resolveTitleMeta(tmdbId: number, mediaType: MediaType): Promise<TitleMeta> {
  const rows = await prisma.title.findMany({
    where: { tmdbId, mediaType },
    select: { title: true, posterUrl: true, releaseYear: true },
  });
  const best = rows.find((r) => r.posterUrl) ?? rows[0];
  if (best) return { title: best.title, posterUrl: best.posterUrl, releaseYear: best.releaseYear };

  const details = await getDetails(tmdbId, toTmdbMediaType(mediaType));
  return { title: details.title, posterUrl: details.posterUrl, releaseYear: details.releaseYear };
}
