import type { TitleModel, ReviewModel } from "@/generated/prisma/models";
import type { MediaType as TmdbMediaType } from "./tmdb";
import type { ResolvedAuthor } from "./profile";
import type { CastMemberDTO, DirectorCreditDTO, MediaType, PublicReviewDTO, ReviewDTO, TitleDTO } from "./types";

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
    seasonEpisodeCounts: title.seasonEpisodeCounts,
    topCast: (title.topCast as unknown as CastMemberDTO[] | null) ?? null,
    directors: (title.directors as unknown as DirectorCreditDTO[] | null) ?? null,
    watchUrl: title.watchUrl,
    addedAt: title.addedAt.toISOString(),
    watchedAt: title.watchedAt ? title.watchedAt.toISOString() : null,
  };
}

export function toReviewDTO(
  review: ReviewModel,
  author: ResolvedAuthor,
  viewerId: string | null,
  likes: { count: number; likedByViewer: boolean } = { count: 0, likedByViewer: false }
): ReviewDTO {
  return {
    id: review.id,
    tmdbId: review.tmdbId,
    mediaType: review.mediaType,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    author,
    isOwn: viewerId !== null && review.userId === viewerId,
    likeCount: likes.count,
    likedByViewer: likes.likedByViewer,
  };
}

/** Strips a review down to its public, non-identifying content for logged-out share pages. */
export function toPublicReviewDTO(review: ReviewModel): PublicReviewDTO {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
