import Link from "next/link";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import { SectionHeading } from "./section-heading";
import type { FavoriteTitleDTO } from "@/lib/types";

export function FavoritesStrip({ favorites }: { favorites: FavoriteTitleDTO[] }) {
  if (favorites.length === 0) return null;

  return (
    <section className="mt-10">
      <SectionHeading title="Favorites" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {favorites.map((fav) => {
          const MediaIcon = fav.mediaType === "TV" ? Tv : Film;
          const poster = (
            <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-surface-elevated shadow-sm">
              {fav.posterUrl ? (
                <Image src={fav.posterUrl} alt={fav.title} fill sizes="200px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MediaIcon size={22} className="text-muted" />
                </div>
              )}
            </div>
          );
          return (
            <div key={`${fav.tmdbId}:${fav.mediaType}`} className="flex flex-col gap-1">
              {fav.viewerTitleId ? (
                <Link href={`/t/${fav.viewerTitleId}`} className="transition-opacity hover:opacity-80">
                  {poster}
                </Link>
              ) : (
                poster
              )}
              <p className="truncate text-xs text-muted" title={fav.title}>
                {fav.title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
