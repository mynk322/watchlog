import Link from "next/link";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import { StarRating } from "./star-rating";
import { formatRelativeTime } from "@/lib/utils";
import type { ProfileReviewDTO } from "@/lib/types";

/** Prisma sets createdAt/updatedAt in the same write, so treat sub-2s gaps as "not edited". */
function wasEdited(review: ProfileReviewDTO): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 2000;
}

export function ProfileReviewCard({ review }: { review: ProfileReviewDTO }) {
  const { title } = review;
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
    <div className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
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
        <p className="mt-2 text-xs text-muted">
          <time dateTime={review.createdAt} suppressHydrationWarning>
            {formatRelativeTime(review.createdAt)}
          </time>
          {wasEdited(review) && <span className="text-muted/70"> · edited</span>}
        </p>
      </div>
    </div>
  );
}
