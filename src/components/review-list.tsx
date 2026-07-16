import Link from "next/link";
import { User, Pencil, Trash2 } from "lucide-react";
import { StarRating } from "./star-rating";
import { LikeButton } from "./like-button";
import { formatRelativeTime } from "@/lib/utils";
import type { ReviewDTO } from "@/lib/types";

/** Prisma sets createdAt/updatedAt in the same write, so treat sub-2s gaps as "not edited". */
function wasEdited(review: ReviewDTO): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 2000;
}

interface ReviewListProps {
  reviews: ReviewDTO[];
  onEdit?: (review: ReviewDTO) => void;
  onDelete?: (review: ReviewDTO) => void;
}

export function ReviewList({ reviews, onEdit, onDelete }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">No reviews yet — be the first to write one.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
              {review.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative avatar, not worth the Image optimizer overhead
                <img src={review.author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={16} className="text-muted" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/u/${review.author.handle}`}
                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {review.author.displayName}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    <Link href={`/u/${review.author.handle}`} className="hover:underline">
                      @{review.author.handle}
                    </Link>
                    <span className="mx-1">&middot;</span>
                    <time dateTime={review.createdAt} suppressHydrationWarning>
                      {formatRelativeTime(review.createdAt)}
                    </time>
                    {wasEdited(review) && <span className="text-muted/70"> · edited</span>}
                  </p>
                </div>
                {review.isOwn && (onEdit || onDelete) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(review)}
                        aria-label="Edit your review"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(review)}
                        aria-label="Delete your review"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {review.rating != null && (
                <div className="mt-1.5">
                  <StarRating value={review.rating} readOnly size={13} variant="surface" />
                </div>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{review.body}</p>
              <div className="mt-2">
                <LikeButton reviewId={review.id} initialLiked={review.likedByViewer} initialCount={review.likeCount} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
