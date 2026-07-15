import type { TitleModel } from "@/generated/prisma/models";
import type { MediaType as TmdbMediaType } from "./tmdb";
import type { CastMemberDTO, DirectorCreditDTO, MediaType, TitleDTO } from "./types";

export function toTmdbMediaType(mediaType: MediaType): TmdbMediaType {
  return mediaType === "TV" ? "tv" : "movie";
}

export function toTitleDTO(title: TitleModel): TitleDTO {
  return {
    id: title.id,
    tmdbId: title.tmdbId,
    mediaType: title.mediaType,
    title: title.title,
    releaseYear: title.releaseYear,
    posterUrl: title.posterUrl,
    backdropUrl: title.backdropUrl,
    overview: title.overview,
    genres: title.genres,
    voteAverage: title.voteAverage,
    runtime: title.runtime,
    status: title.status,
    rating: title.rating,
    currentSeason: title.currentSeason,
    currentEpisode: title.currentEpisode,
    totalSeasons: title.totalSeasons,
    topCast: (title.topCast as unknown as CastMemberDTO[] | null) ?? null,
    directors: (title.directors as unknown as DirectorCreditDTO[] | null) ?? null,
    watchUrl: title.watchUrl,
    addedAt: title.addedAt.toISOString(),
    watchedAt: title.watchedAt ? title.watchedAt.toISOString() : null,
  };
}
