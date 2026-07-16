export type MediaType = "MOVIE" | "TV";
export type TitleStatus = "WATCHED" | "WATCHLIST";

export interface CastMemberDTO {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface DirectorCreditDTO {
  id: number;
  name: string;
  role: "Director" | "Creator";
  profilePath: string | null;
}

export interface TitleDTO {
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
  status: TitleStatus;
  rating: number | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  totalSeasons: number | null;
  seasonEpisodeCounts: number[];
  topCast: CastMemberDTO[] | null;
  directors: DirectorCreditDTO[] | null;
  watchUrl: string | null;
  addedAt: string;
  watchedAt: string | null;
}

export interface SearchResultDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  voteAverage: number;
  popularity: number;
  alreadyAdded: TitleStatus | null;
}

export interface TrendingDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  voteAverage: number;
  alreadyAdded: TitleStatus | null;
}
