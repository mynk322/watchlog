import { Star } from "lucide-react";
import { formatRating } from "@/lib/utils";

export function RatingBadge({ voteAverage }: { voteAverage: number | null }) {
  const rating = formatRating(voteAverage);
  if (!rating || rating === "0.0") return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-gold">
      <Star size={14} className="fill-gold text-gold" />
      {rating}
    </span>
  );
}
