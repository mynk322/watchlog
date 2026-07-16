import Link from "next/link";
import { User } from "lucide-react";
import { FollowButton } from "./follow-button";
import type { UserSummaryDTO } from "@/lib/types";

export function UserListItem({ user }: { user: UserSummaryDTO }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Link href={`/u/${user.handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the Image optimizer overhead
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User size={16} className="text-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user.displayName}</p>
          <p className="truncate text-xs text-muted">@{user.handle}</p>
        </div>
      </Link>
      {!user.isSelf && (
        <FollowButton targetUserId={user.userId} initialIsFollowing={user.isFollowing} size="sm" />
      )}
    </div>
  );
}
