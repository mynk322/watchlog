import Link from "next/link";
import Image from "next/image";
import { Film, Tv, User, Eye, Star, Bookmark, Heart, ListMusic, CheckCircle2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityDTO } from "@/lib/types";

function ActivityIcon({ type }: { type: ActivityDTO["type"] }) {
  switch (type) {
    case "WATCHED":
      return <Eye size={14} className="text-accent" />;
    case "RATED":
      return <Star size={14} className="text-accent" />;
    case "WATCHLISTED":
      return <Bookmark size={14} className="text-accent" />;
    case "FAVORITED":
      return <Heart size={14} className="text-accent" />;
    case "FINISHED_SEASON":
      return <CheckCircle2 size={14} className="text-accent" />;
    case "LIST_CREATED":
      return <ListMusic size={14} className="text-accent" />;
  }
}

function phrase(a: ActivityDTO): string {
  switch (a.type) {
    case "WATCHED":
      return a.rating ? `watched and rated ${a.title} ${a.rating}★` : `watched ${a.title}`;
    case "RATED":
      return `rated ${a.title} ${a.rating}★`;
    case "WATCHLISTED":
      return `added ${a.title} to their watchlist`;
    case "FAVORITED":
      return `favorited ${a.title}`;
    case "FINISHED_SEASON":
      return `finished season ${a.season} of ${a.title}`;
    case "LIST_CREATED":
      return `created the list ${a.listName}`;
  }
}

/** One activity-feed row: who did what, when, with a thumbnail linking to the title (or list). */
export function ActivityCard({ activity }: { activity: ActivityDTO }) {
  const MediaIcon = activity.mediaType === "TV" ? Tv : Film;
  const href =
    activity.type === "LIST_CREATED" && activity.listId
      ? `/lists/${activity.listId}`
      : activity.titleId
        ? `/t/${activity.titleId}`
        : null;

  const thumb =
    activity.type !== "LIST_CREATED" ? (
      <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
        {activity.posterUrl ? (
          <Image src={activity.posterUrl} alt="" fill sizes="40px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MediaIcon size={14} className="text-muted" />
          </div>
        )}
      </div>
    ) : null;

  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-muted/40">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
        {activity.actor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar
          <img src={activity.actor.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User size={16} className="text-muted" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <ActivityIcon type={activity.type} />
        <span className="ml-1.5">
          <span className="font-semibold text-foreground">{activity.actor.displayName}</span>{" "}
          <span className="text-muted">{phrase(activity)}</span>
        </span>
        <span className="ml-2 text-xs text-muted" suppressHydrationWarning>
          {formatRelativeTime(activity.createdAt)}
        </span>
      </div>
      {thumb}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
