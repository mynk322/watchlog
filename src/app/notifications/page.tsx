import Link from "next/link";
import type { Metadata } from "next";
import { User, UserPlus, Heart, MessageCircle } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getNotifications, markAllRead } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — Watchlog",
};

const VERB: Record<NotificationDTO["type"], string> = {
  FOLLOW: "started following you",
  LIKE: "liked your review",
  COMMENT: "commented on your review",
};

function NotificationIcon({ type }: { type: NotificationDTO["type"] }) {
  if (type === "FOLLOW") return <UserPlus size={14} className="text-accent" />;
  if (type === "LIKE") return <Heart size={14} className="text-accent" />;
  return <MessageCircle size={14} className="text-accent" />;
}

export default async function NotificationsPage() {
  const { userId } = await auth.protect();
  const notifications = await getNotifications(userId);
  // Mark read after reading, so this render still reflects what was new; the badge clears next visit.
  await markAllRead(userId);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Notifications</h1>

      <div className="mt-6 flex flex-col gap-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Follows, likes, and comments on your reviews show up here.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 rounded-2xl border border-border p-3 ${n.read ? "bg-surface" : "bg-surface-elevated"}`}
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
                {n.actor.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the Image optimizer overhead
                  <img src={n.actor.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User size={16} className="text-muted" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <NotificationIcon type={n.type} />
                <span className="ml-1.5">
                  <Link href={`/u/${n.actor.handle}`} className="font-semibold text-foreground hover:underline">
                    {n.actor.displayName}
                  </Link>{" "}
                  <span className="text-muted">{VERB[n.type]}</span>
                </span>
                <span className="ml-2 text-xs text-muted" suppressHydrationWarning>
                  {formatRelativeTime(n.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
