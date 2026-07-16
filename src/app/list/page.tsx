"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Film, Tv, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
  getGhostServerSnapshot,
  getGhostSnapshot,
  removeGhostItem,
  subscribeGhost,
} from "@/lib/ghost-watchlist";

export default function GhostListPage() {
  const { isSignedIn } = useAuth();
  const items = useSyncExternalStore(subscribeGhost, getGhostSnapshot, getGhostServerSnapshot);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Your list</h1>
        <p className="text-sm text-muted">
          {isSignedIn
            ? "Anything you saved before signing in has been moved to your watchlist."
            : "Saved on this device. Sign up to keep these and sync them everywhere."}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            {isSignedIn ? (
              <>
                Your list is empty here.{" "}
                <Link href="/#watchlist" className="text-accent hover:underline">
                  Go to your watchlist
                </Link>
                .
              </>
            ) : (
              <>
                You haven&rsquo;t saved anything yet. Open a title and tap{" "}
                <span className="text-foreground">Watchlist</span>.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={`${item.tmdbId}:${item.mediaType}`} className="group relative">
              <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-surface">
                {item.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external TMDB poster; matches app convention
                  <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {item.mediaType === "TV" ? (
                      <Tv size={28} className="text-muted" />
                    ) : (
                      <Film size={28} className="text-muted" />
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeGhostItem(item.tmdbId, item.mediaType)}
                  aria-label={`Remove ${item.title}`}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/80 group-hover:opacity-100 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-2 truncate text-sm text-foreground">{item.title}</p>
            </div>
          ))}
        </div>
      )}

      {!isSignedIn && items.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-gradient-to-b from-accent/10 to-transparent p-6">
          <p className="flex-1 text-sm text-muted">
            <span className="font-semibold text-foreground">{items.length}</span>{" "}
            {items.length === 1 ? "title" : "titles"} saved on this device. Sign up and we&rsquo;ll move them into your
            watchlist automatically.
          </p>
          <Link
            href="/sign-up"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Sign up free
          </Link>
        </div>
      )}
    </div>
  );
}
