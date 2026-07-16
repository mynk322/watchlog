"use client";

import { useState } from "react";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import type { MediaType, ReviewDTO } from "@/lib/types";

interface ReviewSectionProps {
  tmdbId: number;
  mediaType: MediaType;
  initialReviews: ReviewDTO[];
  ratingHint: number | null;
}

export function ReviewSection({ tmdbId, mediaType, initialReviews, ratingHint }: ReviewSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [editingReview, setEditingReview] = useState<ReviewDTO | null>(null);

  const ownReview = reviews.find((r) => r.isOwn) ?? null;
  const showForm = editingReview !== null || !ownReview;

  function handleSaved(review: ReviewDTO) {
    setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
    setEditingReview(null);
  }

  async function handleDelete(review: ReviewDTO) {
    if (!window.confirm("Delete your review? This can't be undone.")) return;
    const previous = reviews;
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    setEditingReview(null);
    const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      // Server rejected the delete — restore the optimistically removed review.
      setReviews(previous);
    }
  }

  const hiddenWhileEditingId = showForm ? (editingReview ?? ownReview)?.id : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-foreground">Reviews</h2>
      {showForm && (
        <ReviewForm
          tmdbId={tmdbId}
          mediaType={mediaType}
          existingReview={editingReview ?? ownReview}
          ratingHint={ratingHint}
          onSaved={handleSaved}
          onCancel={editingReview ? () => setEditingReview(null) : undefined}
        />
      )}
      <ReviewList
        reviews={reviews.filter((r) => r.id !== hiddenWhileEditingId)}
        onEdit={(r) => setEditingReview(r)}
        onDelete={handleDelete}
      />
    </div>
  );
}
