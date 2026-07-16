"use client";

import { useState, type MouseEvent } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  readOnly?: boolean;
  /** "overlay" (default) assumes a dark poster/backdrop background. "surface" is for plain bg-surface cards, e.g. reviews. */
  variant?: "overlay" | "surface";
}

const STAR_COUNT = 5;

/** Given a pointer event over a single star (index `i`), returns that star's fractional value (i+0.5 or i+1). */
function starValueFromPointer(e: MouseEvent<HTMLDivElement>, i: number) {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  return i + (ratio <= 0.5 ? 0.5 : 1);
}

export function StarRating({ value, onChange, size = 16, readOnly = false, variant = "overlay" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value ?? 0;

  if (readOnly) {
    return (
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: STAR_COUNT }).map((_, i) => (
          <StarGlyph key={i} filled={displayValue - i} size={size} variant={variant} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHoverValue(null)}
      role="slider"
      aria-label="Your rating"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value ?? 0}
    >
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="relative cursor-pointer"
          style={{ width: size, height: size }}
          onMouseMove={(e) => setHoverValue(starValueFromPointer(e, i))}
          onClick={(e) => {
            const next = starValueFromPointer(e, i);
            onChange?.(next === value ? null : next);
          }}
        >
          <StarGlyph filled={displayValue - i} size={size} variant={variant} />
        </div>
      ))}
    </div>
  );
}

function StarGlyph({ filled, size, variant }: { filled: number; size: number; variant: "overlay" | "surface" }) {
  const clamped = Math.max(0, Math.min(1, filled));
  if (clamped >= 1) {
    return <Star size={size} className="fill-gold text-gold" />;
  }
  if (clamped >= 0.5) {
    return <StarHalf size={size} className="fill-gold text-gold" />;
  }
  return <Star size={size} className={cn(variant === "surface" ? "text-muted/40" : "text-white/30")} />;
}
