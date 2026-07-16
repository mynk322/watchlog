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
  bio: string | null;
  reviewCount: number;
  /** Average of the star ratings this user attached to reviews (null when they've rated none). */
  avgRating: number | null;
  /** Total likes across all of this user's reviews. */
  likesReceived: number;
}

/** The title a review is about, resolved for display on a profile page (Title rows are per-user, so this comes from whichever user's row has it). */
export interface ReviewTitleRefDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  /** The viewer's own Title row id, if they've added this title. Null when the viewer hasn't added it. */
  viewerTitleId: string | null;
  /** Best Title row id to link to (the viewer's own if present, otherwise any user's — /t/[id] is
   *  public). Null only when no user has this title, so the card can always link when one exists. */
  titleId: string | null;
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
  likeCount: number;
  /** Whether the requesting user has liked this review. */
  likedByViewer: boolean;
}

/** A review shown on a profile page or feed: the base review (which carries its author) plus the title it's about. */
export interface ProfileReviewDTO extends ReviewDTO {
  title: ReviewTitleRefDTO;
}

export interface CommentDTO {
  id: string;
  reviewId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthorDTO;
  /** True when the comment belongs to the requesting user — gates edit/delete affordances. */
  isOwn: boolean;
}

/** A recommendation shown on someone's profile: a title they rated highly, matched to the viewer. */
export interface ProfileRecommendationDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  /** The profile owner's Title row id — links to the public /t/[id] page. */
  titleId: string;
  /** The profile owner's own rating of this title. */
  ownerRating: number;
}

/** A recent review shown on the public home ("what people are watching"). */
export interface RecentReviewDTO {
  id: string;
  rating: number | null;
  body: string;
  createdAt: string;
  author: { displayName: string; handle: string };
  title: {
    tmdbId: number;
    mediaType: MediaType;
    title: string;
    posterUrl: string | null;
    releaseYear: number | null;
    /** Any user's Title row id for this title, so the card can link to the public /t/[id] page. */
    titleId: string | null;
  };
}

/** A title pinned to a profile's favorites. Metadata is snapshotted at pin time. */
export interface FavoriteTitleDTO {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  /** The viewer's own Title row id for this title, if they have it — for linking to /t/[id]. */
  viewerTitleId: string | null;
}

export type NotificationType = "FOLLOW" | "LIKE" | "COMMENT";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  /** The user who triggered the notification. */
  actor: ReviewAuthorDTO;
  /** The review involved, for LIKE/COMMENT; null for FOLLOW. */
  reviewId: string | null;
  /** The title of the review involved (LIKE/COMMENT), when resolvable. */
  reviewTitle: string | null;
  /** Where clicking the notification should go (the actor's profile, or the review's location). */
  href: string;
  read: boolean;
  createdAt: string;
}

/**
 * A review shown on a public, logged-out share page. Deliberately carries NO author identity
 * (no userId, name, handle, or avatar) or viewer-specific state — only the review content.
 */
export interface PublicReviewDTO {
  id: string;
  rating: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
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
