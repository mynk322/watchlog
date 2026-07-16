import Link from "next/link";
import Image from "next/image";
import { Film, Tv, Star } from "lucide-react";
import type { ProfileRecommendationDTO } from "@/lib/types";

/**
 * "Picks from this profile" — titles the owner rated highly, matched to the viewer's taste. Every
 * card links to the public title page.
 */
export function ProfileRecommendations({
  displayName,
  recommendations,
}: {
  displayName: string;
  recommendations: ProfileRecommendationDTO[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted">Recommended from {displayName}</h2>
        <span className="text-xs text-muted">Rated highly by them, picked for you</span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {recommendations.map((rec) => {
          const MediaIcon = rec.mediaType === "TV" ? Tv : Film;
          return (
            <Link
              key={`${rec.tmdbId}:${rec.mediaType}`}
              href={`/t/${rec.titleId}`}
              className="group flex flex-col gap-1"
            >
              <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-surface-elevated transition-opacity group-hover:opacity-80">
                {rec.posterUrl ? (
                  <Image src={rec.posterUrl} alt="" fill sizes="160px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <MediaIcon size={20} className="text-muted" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                  <Star size={9} className="fill-gold" />
                  {rec.ownerRating}
                </div>
              </div>
              <p className="truncate text-xs text-muted group-hover:text-foreground" title={rec.title}>
                {rec.title}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
