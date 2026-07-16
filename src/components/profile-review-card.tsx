import Link from "next/link";
import Image from "next/image";
import { Film, Tv, User } from "lucide-react";
import { StarRating } from "./star-rating";
import { LikeButton } from "./like-button";
import { CommentSection } from "./comment-section";
import { ReviewBody } from "./review-body";
import { formatRelativeTime } from "@/lib/utils";
import type { ProfileReviewDTO } from "@/lib/types";

/** Prisma sets createdAt/updatedAt in the same write, so treat sub-2s gaps as "not edited". */
function wasEdited(review: ProfileReviewDTO): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 2000;
}

interface ProfileReviewCardProps {
  review: ProfileReviewDTO;
  /** Show the review's author (avatar + name) above it — used on the feed, where authors differ. */
  showAuthor?: boolean;
}

export function ProfileReviewCard({ review, showAuthor = false }: ProfileReviewCardProps) {
  const { title, author } = review;
  const MediaIcon = title.mediaType === "TV" ? Tv : Film;

  const poster = (
    <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-elevated shadow-sm sm:w-24">
      {title.posterUrl ? (
        <Image src={title.posterUrl} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MediaIcon size={22} className="text-muted" />
        </div>
      )}
    </div>
  );

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-muted/40">
      {title.titleId ? (
        <Link href={`/t/${title.titleId}`} className="shrink-0 transition-opacity hover:opacity-80">
          {poster}
        </Link>
      ) : (
        poster
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {showAuthor && (
          <Link href={`/u/${author.handle}`} className="flex items-center gap-2 hover:opacity-80">
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
              {author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the optimizer
                <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={12} className="text-muted" />
                </div>
              )}
            </div>
            <span className="truncate text-xs font-semibold text-foreground">{author.displayName}</span>
            <span className="truncate text-xs text-muted">@{author.handle}</span>
          </Link>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {title.titleId ? (
              <Link href={`/t/${title.titleId}`} className="truncate text-base font-semibold text-foreground hover:underline">
                {title.title}
              </Link>
            ) : (
              <span className="truncate text-base font-semibold text-foreground">{title.title}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted">
              <MediaIcon size={11} />
              {title.releaseYear ?? "—"}
            </span>
            {review.rating != null && <StarRating value={review.rating} readOnly size={14} variant="surface" />}
          </div>
        </div>

        <ReviewBody body={review.body} />

        <div className="flex items-center gap-3 text-xs text-muted">
          <LikeButton reviewId={review.id} initialLiked={review.likedByViewer} initialCount={review.likeCount} />
          <time dateTime={review.createdAt} suppressHydrationWarning>
            {formatRelativeTime(review.createdAt)}
          </time>
          {wasEdited(review) && <span className="text-muted/70">· edited</span>}
        </div>

        <CommentSection reviewId={review.id} />
      </div>
    </article>
  );
}
