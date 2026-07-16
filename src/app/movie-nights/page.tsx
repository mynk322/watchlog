import Link from "next/link";
import type { Metadata } from "next";
import { Popcorn } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { NewMovieNightButton } from "@/components/new-movie-night-button";
import { formatRelativeTime } from "@/lib/utils";
import { getMovieNights } from "@/lib/movie-nights";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Movie nights — Watchlog",
};

export default async function MovieNightsPage() {
  await auth.protect();
  const nights = await getMovieNights();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Movie nights</h1>
          <p className="mt-1 text-sm text-muted">Start a poll and let everyone vote on what to watch.</p>
        </div>
        <NewMovieNightButton />
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {nights.length === 0 ? (
          <p className="text-sm text-muted">No movie nights yet. Start one above.</p>
        ) : (
          nights.map((n) => (
            <Link
              key={n.id}
              href={`/movie-nights/${n.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-muted/40"
            >
              <Popcorn size={20} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{n.name}</p>
                <p className="text-xs text-muted">
                  by {n.host.displayName} · {n.candidateCount} {n.candidateCount === 1 ? "title" : "titles"} ·{" "}
                  <span suppressHydrationWarning>{formatRelativeTime(n.createdAt)}</span>
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  n.status === "OPEN" ? "bg-accent/15 text-accent" : "bg-surface-elevated text-muted"
                }`}
              >
                {n.status === "OPEN" ? "Open" : "Closed"}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
