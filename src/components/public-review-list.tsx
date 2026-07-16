import Link from "next/link";
import { User, Heart, MessageCircle } from "lucide-react";
import { StarRating } from "./star-rating";
import { formatRelativeTime } from "@/lib/utils";
import type { PublicAuthor, PublicTitleReviewDTO } from "@/lib/public-title";

/** Prisma sets createdAt/updatedAt in the same write, so treat sub-2s gaps as "not edited". */
function wasEdited(review: PublicTitleReviewDTO): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 2000;
}

function Avatar({ author, size }: { author: PublicAuthor; size: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-surface-elevated"
      style={{ height: size, width: size }}
    >
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the Image optimizer overhead
        <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User size={Math.round(size * 0.5)} className="text-muted" />
        </div>
      )}
    </div>
  );
}

/**
 * Read-only reviews for the logged-out title page: real (public) authors, ratings, like counts, and
 * comment threads, but no like/comment/edit affordances. Actions live behind sign-in.
 */
export function PublicReviewList({ reviews }: { reviews: PublicTitleReviewDTO[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">No reviews yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <Avatar author={review.author} size={40} />
            <div className="min-w-0 flex-1">
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
              {review.rating != null && (
                <div className="mt-1.5">
                  <StarRating value={review.rating} readOnly size={13} variant="surface" />
                </div>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {review.body}
              </p>

              {/* Read-only like + comment counts. Signing in unlocks the interactive versions. */}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Heart size={14} />
                  {review.likeCount > 0 && <span>{review.likeCount}</span>}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle size={14} />
                  {review.comments.length > 0 && <span>{review.comments.length}</span>}
                </span>
              </div>

              {review.comments.length > 0 && (
                <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                  {review.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar author={comment.author} size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <Link
                            href={`/u/${comment.author.handle}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {comment.author.displayName}
                          </Link>{" "}
                          <span className="text-muted" suppressHydrationWarning>
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
