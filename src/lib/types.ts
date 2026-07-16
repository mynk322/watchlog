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

export interface ReviewAuthorDTO {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

export interface ProfileDTO {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  reviewCount: number;
}

/** The title a review is about, resolved for display on a profile page (Title rows are per-user, so this comes from whichever user's row has it). */
export interface ReviewTitleRefDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  /** The viewer's own Title row id, if they've added this title — lets the card link to /t/[id]. Null when the viewer hasn't added it. */
  viewerTitleId: string | null;
}

export interface ReviewDTO {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  rating: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthorDTO;
  /** True when the review belongs to the requesting user — lets the client show edit/delete affordances. */
  isOwn: boolean;
}

/** A review shown on a profile page or feed: the base review (which carries its author) plus the title it's about. */
export interface ProfileReviewDTO extends ReviewDTO {
  title: ReviewTitleRefDTO;
}

export interface FollowStatsDTO {
  followerCount: number;
  followingCount: number;
  /** Whether the viewer follows this profile. Always false when viewing your own profile. */
  isFollowing: boolean;
}

/** A user as shown in a follower/following list. */
export interface UserSummaryDTO {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  /** Whether the viewer follows this user. */
  isFollowing: boolean;
  /** Whether this row is the viewer themselves (no follow button). */
  isSelf: boolean;
}
