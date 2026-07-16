"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import type { MediaType, ReviewDTO } from "@/lib/types";

interface ReviewFormProps {
  tmdbId: number;
  mediaType: MediaType;
  existingReview: ReviewDTO | null;
  /** Prefills the rating when the viewer has no review yet but has rated this title in their collection. */
  ratingHint?: number | null;
  onSaved: (review: ReviewDTO) => void;
  onCancel?: () => void;
}

export function ReviewForm({ tmdbId, mediaType, existingReview, ratingHint, onSaved, onCancel }: ReviewFormProps) {
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [rating, setRating] = useState<number | null>(existingReview?.rating ?? ratingHint ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, body, rating }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save review");
        return;
      }
      const data = await res.json();
      onSaved(data.review);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {existingReview ? "Edit your review" : "Write a review"}
        </span>
        <StarRating value={rating} onChange={setRating} size={16} variant="surface" />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        rows={4}
        maxLength={4000}
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && <p className="text-xs text-accent">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : existingReview ? "Save changes" : "Post review"}
        </button>
      </div>
    </form>
  );
}
