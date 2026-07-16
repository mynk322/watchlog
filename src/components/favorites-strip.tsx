import Link from "next/link";
import Image from "next/image";
import { Film, Tv } from "lucide-react";
import type { FavoriteTitleDTO } from "@/lib/types";

export function FavoritesStrip({ favorites }: { favorites: FavoriteTitleDTO[] }) {
  if (favorites.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-muted">Favorites</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {favorites.map((fav) => {
          const MediaIcon = fav.mediaType === "TV" ? Tv : Film;
          const poster = (
            <div className="group relative aspect-2/3 overflow-hidden rounded-lg bg-surface-elevated">
              {fav.posterUrl ? (
                <Image src={fav.posterUrl} alt={fav.title} fill sizes="120px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MediaIcon size={20} className="text-muted" />
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
