import { User } from "lucide-react";
import { StarRating } from "./star-rating";
import { formatRelativeTime } from "@/lib/utils";
import type { PublicReviewDTO } from "@/lib/types";

/** Prisma sets createdAt/updatedAt in the same write, so treat sub-2s gaps as "not edited". */
function wasEdited(review: PublicReviewDTO): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 2000;
}

/**
 * Read-only review list for the logged-out share page. Authors are shown as an anonymous
 * "Watchlog member" — no name, handle, avatar, or profile link — so no PII is exposed.
 */
export function PublicReviewList({ reviews }: { reviews: PublicReviewDTO[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">No reviews yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
              <User size={16} className="text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Watchlog member</p>
              <p className="truncate text-xs text-muted">
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
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{review.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
