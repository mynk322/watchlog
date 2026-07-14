"use client";

import { useMemo } from "react";
import { Eye, Bookmark, Trash2 } from "lucide-react";
import { PosterCard } from "./poster-card";
import { PillButton } from "./pill-button";
import { useTitles } from "@/hooks/use-titles";
import type { TitleStatus } from "@/lib/types";

function groupByYear<T extends { releaseYear: number | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.releaseYear ? String(item.releaseYear) : "Unknown year";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "Unknown year") return 1;
    if (b[0] === "Unknown year") return -1;
    return Number(b[0]) - Number(a[0]);
  });
}

export function TitleGrid({ status, emptyHint }: { status: TitleStatus; emptyHint: string }) {
  const { titles, loading, updateStatus, removeTitle } = useTitles(status);
  const grouped = useMemo(() => groupByYear(titles), [titles]);

  if (!loading && titles.length === 0) {
    return <p className="text-sm text-muted">{emptyHint}</p>;
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

  return (
    <div className="flex flex-col gap-10">
      {grouped.map(([year, items]) => (
        <div key={year}>
          <h3 className="mb-4 text-lg font-semibold text-foreground">{year}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <PosterCard
                key={item.id}
                posterUrl={item.posterUrl}
                title={item.title}
                releaseYear={item.releaseYear}
                overview={item.overview}
                voteAverage={item.voteAverage}
                genres={item.genres}
                runtime={item.runtime}
                mediaType={item.mediaType}
                watchUrl={item.watchUrl}
                actions={
                  <>
                    {status === "WATCHLIST" ? (
                      <PillButton
                        icon={<Eye size={12} />}
                        variant="solid"
                        onClick={() => updateStatus(item.id, "WATCHED")}
                      >
                        Mark watched
                      </PillButton>
                    ) : (
                      <PillButton
                        icon={<Bookmark size={12} />}
                        onClick={() => updateStatus(item.id, "WATCHLIST")}
                      >
                        Move to watchlist
                      </PillButton>
                    )}
                    <PillButton icon={<Trash2 size={12} />} onClick={() => removeTitle(item.id)}>
                      Remove
                    </PillButton>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
