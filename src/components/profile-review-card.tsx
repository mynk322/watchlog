import Link from "next/link";
import Image from "next/image";
import { Film, Tv, User } from "lucide-react";
import { StarRating } from "./star-rating";
import { LikeButton } from "./like-button";
import { CommentSection } from "./comment-section";
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
    <div className="relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-elevated sm:w-20">
      {title.posterUrl ? (
        <Image src={title.posterUrl} alt="" fill sizes="80px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MediaIcon size={20} className="text-muted" />
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {showAuthor && (
        <Link href={`/u/${author.handle}`} className="mb-3 flex items-center gap-2 hover:opacity-80">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the Image optimizer overhead
              <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User size={14} className="text-muted" />
              </div>
            )}
          </div>
          <span className="truncate text-sm font-semibold text-foreground">{author.displayName}</span>
          <span className="truncate text-xs text-muted">@{author.handle}</span>
        </Link>
      )}
      <div className="flex gap-4">
        {title.viewerTitleId ? (
          <Link href={`/t/${title.viewerTitleId}`} className="transition-opacity hover:opacity-80">
            {poster}
          </Link>
        ) : (
          poster
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <MediaIcon size={12} />
            <span>{title.releaseYear ?? "—"}</span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {title.viewerTitleId ? (
              <Link href={`/t/${title.viewerTitleId}`} className="hover:underline">
                {title.title}
              </Link>
            ) : (
              title.title
            )}
          </p>
          {review.rating != null && (
            <div className="mt-1.5">
              <StarRating value={review.rating} readOnly size={13} variant="surface" />
            </div>
          )}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{review.body}</p>
          <div className="mt-2 flex items-center gap-3">
            <LikeButton reviewId={review.id} initialLiked={review.likedByViewer} initialCount={review.likeCount} />
            <p className="text-xs text-muted">
              <time dateTime={review.createdAt} suppressHydrationWarning>
                {formatRelativeTime(review.createdAt)}
              </time>
              {wasEdited(review) && <span className="text-muted/70"> · edited</span>}
            </p>
          </div>
          <div className="mt-2">
            <CommentSection reviewId={review.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
