"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  reviewId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ reviewId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !liked;
    // Optimistic: flip state and nudge the count immediately.
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setPending(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: next ? "POST" : "DELETE" }).catch(() => null);
      if (!res || !res.ok) {
        setLiked(!next); // roll back on failure
        setCount((c) => c + (next ? -1 : 1));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike review" : "Like review"}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer",
        liked ? "text-accent" : "text-muted hover:text-foreground"
      )}
    >
      <Heart size={14} className={cn(liked && "fill-accent")} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
