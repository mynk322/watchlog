"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Tv } from "lucide-react";
import { RatingBadge } from "./rating-badge";
import { StarRating } from "./star-rating";
import { formatRuntime } from "@/lib/utils";
import { googleSearchUrl } from "@/lib/tmdb-shared";

interface ShowProgress {
  currentSeason: number | null;
  currentEpisode: number | null;
  totalSeasons: number | null;
  seasonEpisodeCounts: number[];
}

interface PosterCardProps {
  posterUrl: string | null;
  title: string;
  releaseYear: number | null;
  overview: string | null;
  voteAverage: number | null;
  genres?: string[];
  runtime?: number | null;
  mediaType: "MOVIE" | "TV";
  watchUrl: string | null;
  actions?: ReactNode;
  priority?: boolean;
  myRating?: number | null;
  onRateChange?: (value: number | null) => void;
  progress?: ShowProgress;
}

export function PosterCard({
  posterUrl,
  title,
  releaseYear,
  overview,
  voteAverage,
  genres = [],
  runtime,
  mediaType,
  watchUrl,
  actions,
  priority,
  myRating,
  onRateChange,
  progress,
}: PosterCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const href = watchUrl || googleSearchUrl(title, releaseYear);

  function handleActionsClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  const episodeCap = progress?.seasonEpisodeCounts[(progress.currentSeason ?? 1) - 1];
  const progressLabel =
    progress && (progress.currentSeason || progress.currentEpisode)
      ? `S${progress.currentSeason ?? 1} · E${progress.currentEpisode ?? 0}${episodeCap ? `/${episodeCap}` : ""}`
      : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative block aspect-2/3 w-full overflow-hidden rounded-xl bg-surface shadow-lg shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {posterUrl && !imgError ? (
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          priority={priority}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-elevated p-4 text-center">
          {mediaType === "TV" ? (
            <Tv size={28} className="text-muted" />
          ) : (
            <Film size={28} className="text-muted" />
          )}
          <span className="text-xs font-medium text-muted">{title}</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 transition-opacity duration-300 group-hover:opacity-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 transition-opacity duration-200 group-hover:opacity-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {releaseYear && <p className="text-xs text-white/70">{releaseYear}</p>}
        {myRating ? (
          <div className="mt-1">
            <StarRating value={myRating} size={11} readOnly />
          </div>
        ) : null}
        {progressLabel && <p className="mt-0.5 text-[11px] font-medium text-white/60">{progressLabel}</p>}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/85 to-black/20 p-3"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-white/70">
              {mediaType === "TV" ? <Tv size={12} /> : <Film size={12} />}
              {releaseYear ?? "—"}
              {runtime ? <span>&middot; {formatRuntime(runtime)}</span> : null}
              {progressLabel ? (
                <span>
                  &middot; {progressLabel}
                  {progress?.totalSeasons ? ` of ${progress.totalSeasons}` : ""}
                </span>
              ) : null}
            </div>
            <h3 className="mb-1 line-clamp-2 text-sm font-bold text-white">{title}</h3>
            <div className="mb-2">
              <RatingBadge voteAverage={voteAverage} />
            </div>
            {overview && (
              <p className="mb-2 line-clamp-3 text-xs leading-snug text-white/80">{overview}</p>
            )}
            {genres.length > 0 && (
              <p className="mb-2 truncate text-[11px] text-white/50">{genres.slice(0, 3).join(" · ")}</p>
            )}
            {onRateChange && (
              <div onClick={handleActionsClick} className="mb-3">
                <StarRating value={myRating ?? null} onChange={onRateChange} size={18} />
              </div>
            )}
            {actions && (
              <div onClick={handleActionsClick} className="flex flex-wrap gap-2">
                {actions}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </a>
  );
}
