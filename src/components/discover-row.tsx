"use client";

import { useEffect, useState } from "react";
import { Bookmark, Eye, Check } from "lucide-react";
import { PosterCard } from "./poster-card";
import { PillButton } from "./pill-button";
import type { TrendingDTO, TitleStatus } from "@/lib/types";

export function DiscoverRow() {
  const [items, setItems] = useState<TrendingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/trending", { cache: "no-store" });
      if (res.ok && !cancelled) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addTitle(item: TrendingDTO, status: TitleStatus) {
    const key = `${item.tmdbId}-${item.mediaType}`;
    setPending(key);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType, status }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.tmdbId === item.tmdbId && i.mediaType === item.mediaType ? { ...i, alreadyAdded: status } : i))
        );
        window.dispatchEvent(new CustomEvent("titles:changed"));
      }
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton aspect-2/3 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Trending titles will show up here once the catalog refreshes.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => {
        const key = `${item.tmdbId}-${item.mediaType}`;
        const isPending = pending === key;
        return (
          <PosterCard
            key={key}
            posterUrl={item.posterUrl}
            title={item.title}
            releaseYear={item.releaseYear}
            overview={item.overview}
            voteAverage={item.voteAverage}
            mediaType={item.mediaType}
            watchUrl={null}
            actions={
              item.alreadyAdded ? (
                <PillButton icon={<Check size={12} />} disabled>
                  {item.alreadyAdded === "WATCHED" ? "Watched" : "On watchlist"}
                </PillButton>
              ) : (
                <>
                  <PillButton
                    icon={<Eye size={12} />}
                    variant="solid"
                    disabled={isPending}
                    onClick={() => addTitle(item, "WATCHED")}
                  >
                    Watched
                  </PillButton>
                  <PillButton
                    icon={<Bookmark size={12} />}
                    disabled={isPending}
                    onClick={() => addTitle(item, "WATCHLIST")}
                  >
                    Watchlist
                  </PillButton>
                </>
              )
            }
          />
        );
      })}
    </div>
  );
}
