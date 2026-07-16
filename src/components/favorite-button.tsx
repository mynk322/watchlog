"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/types";

interface FavoriteButtonProps {
  tmdbId: number;
  mediaType: MediaType;
  initialFavorited: boolean;
}

export function FavoriteButton({ tmdbId, mediaType, initialFavorited }: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !favorited;
    setPending(true);
    setError(null);
    setFavorited(next); // optimistic
    try {
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType }),
      }).catch(() => null);
      if (!res || !res.ok) {
        setFavorited(!next); // roll back
        const payload = res ? await res.json().catch(() => null) : null;
        setError(payload?.error ?? "Couldn't update favorites");
        return;
      }
      router.refresh(); // reflect the change on the profile favorites strip
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer",
          favorited
            ? "border-gold/40 bg-gold/10 text-gold"
            : "border-border bg-surface text-foreground hover:bg-surface-elevated"
        )}
      >
        <Star size={16} className={cn(favorited && "fill-gold")} />
        {favorited ? "Favorited" : "Favorite"}
      </button>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
