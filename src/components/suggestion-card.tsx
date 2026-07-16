"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Film, Tv, User, Check, Plus, X, Loader2 } from "lucide-react";
import type { SuggestionDTO } from "@/lib/types";

/** One received recommendation in the inbox: sender, title, note, and add/dismiss actions. */
export function SuggestionCard({ suggestion }: { suggestion: SuggestionDTO }) {
  const router = useRouter();
  const [gone, setGone] = useState(false);
  const [added, setAdded] = useState(suggestion.inLibrary);
  const [busy, setBusy] = useState<null | "add" | "dismiss">(null);
  const [error, setError] = useState<string | null>(null);

  const MediaIcon = suggestion.mediaType === "TV" ? Tv : Film;

  async function addToWatchlist() {
    setBusy("add");
    setError(null);
    const res = await fetch("/api/titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: suggestion.tmdbId, mediaType: suggestion.mediaType, status: "WATCHLIST" }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      setError("Couldn't add to your watchlist");
      return;
    }
    setAdded(true);
    router.refresh();
  }

  async function dismiss() {
    setBusy("dismiss");
    setError(null);
    const res = await fetch(`/api/suggestions/${suggestion.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setBusy(null);
      setError("Couldn't dismiss");
      return;
    }
    setGone(true); // hide immediately; server list refreshes on next load
    router.refresh();
  }

  if (gone) return null;

  const poster = (
    <div className="relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
      {suggestion.posterUrl ? (
        <Image src={suggestion.posterUrl} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MediaIcon size={18} className="text-muted" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
      {suggestion.titleId ? (
        <Link href={`/t/${suggestion.titleId}`} className="transition-opacity hover:opacity-80">
          {poster}
        </Link>
      ) : (
        poster
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="relative h-5 w-5 overflow-hidden rounded-full bg-surface-elevated">
            {suggestion.from.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny avatar
              <img src={suggestion.from.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <User size={11} className="text-muted" />
              </span>
            )}
          </span>
          <Link href={`/u/${suggestion.from.handle}`} className="font-medium text-foreground hover:text-accent">
            {suggestion.from.displayName}
          </Link>
          recommends
        </div>

        <p className="font-semibold text-foreground">
          {suggestion.title}
          {suggestion.releaseYear ? <span className="font-normal text-muted"> ({suggestion.releaseYear})</span> : null}
        </p>
        {suggestion.message && <p className="text-sm text-muted">&ldquo;{suggestion.message}&rdquo;</p>}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {added ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
              <Check size={13} /> In your library
            </span>
          ) : (
            <button
              type="button"
              onClick={addToWatchlist}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busy === "add" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add to watchlist
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer"
          >
            {busy === "dismiss" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            Dismiss
          </button>
          {error && <span className="text-xs text-accent">{error}</span>}
        </div>
      </div>
    </div>
  );
}
