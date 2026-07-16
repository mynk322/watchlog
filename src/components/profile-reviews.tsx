"use client";

import { useState } from "react";
import { ProfileReviewCard } from "./profile-review-card";
import type { ProfileReviewDTO } from "@/lib/types";

const INITIAL_VISIBLE = 4;
const STEP = 6;

/** Reviews list that reveals in chunks so a prolific reviewer's profile stays scannable. */
export function ProfileReviews({ reviews }: { reviews: ProfileReviewDTO[] }) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  if (reviews.length === 0) {
    return <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No reviews yet.</p>;
  }

  const shown = reviews.slice(0, visible);
  const remaining = reviews.length - shown.length;

  return (
    <div className="flex flex-col gap-4">
      {shown.map((review) => (
        <ProfileReviewCard key={review.id} review={review} />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + STEP)}
          className="mx-auto mt-1 rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground cursor-pointer"
        >
          Load {Math.min(remaining, STEP)} more {remaining === 1 ? "review" : "reviews"}
        </button>
      )}
    </div>
  );
}
