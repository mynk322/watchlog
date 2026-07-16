"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  /** "sm" for compact list rows, "md" (default) for the profile header. */
  size?: "sm" | "md";
}

export function FollowButton({ targetUserId, initialIsFollowing, size = "md" }: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !isFollowing;
    setPending(true);
    setIsFollowing(next); // optimistic
    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      }).catch(() => null);
      if (!res || !res.ok) {
        setIsFollowing(!next); // roll back on failure
        return;
      }
      // Refresh so follower counts / feed reflect the change.
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFollowing}
      className={cn(
        "rounded-full font-semibold transition-colors disabled:opacity-50 cursor-pointer",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        isFollowing
          ? "border border-border bg-surface text-foreground hover:bg-surface-elevated"
          : "bg-accent text-accent-foreground hover:opacity-90"
      )}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
