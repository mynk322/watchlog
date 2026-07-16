import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Film, Tv } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StarRating } from "@/components/star-rating";
import { RatingBadge } from "@/components/rating-badge";
import { ShareButton } from "@/components/share-button";
import { ReviewSection } from "@/components/review-section";
import { getReviewsForTitle } from "@/lib/reviews";
import { formatRuntime } from "@/lib/utils";
import { googleSearchUrl } from "@/lib/tmdb-shared";

export const dynamic = "force-dynamic";

async function getTitle(id: string) {
  const { userId } = await auth.protect();
  return prisma.title.findUnique({ where: { id, userId } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = await getTitle(id);
  if (!title) return {};
  return {
    title: `${title.title} — Watchlog`,
    description: title.overview ?? undefined,
  };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [title, { userId }] = await Promise.all([getTitle(id), auth()]);
  if (!title || !userId) notFound();

  const href = title.watchUrl || googleSearchUrl(title.title, title.releaseYear);
  const reviews = await getReviewsForTitle(title.tmdbId, title.mediaType, userId);

  return (
    <div className="relative">
      {title.backdropUrl && (
        <div className="absolute inset-x-0 top-0 -z-10 h-[50vh] overflow-hidden">
          <Image src={title.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 pb-16 pt-40 sm:flex-row sm:px-8 sm:pt-56">
        <div className="relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-xl bg-surface shadow-2xl shadow-black/50 sm:w-56">
          {title.posterUrl ? (
            <Image src={title.posterUrl} alt={title.title} fill sizes="224px" className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {title.mediaType === "TV" ? (
                <Tv size={32} className="text-muted" />
              ) : (
                <Film size={32} className="text-muted" />
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              {title.mediaType === "TV" ? <Tv size={14} /> : <Film size={14} />}
              {title.releaseYear ?? "—"}
              {title.runtime ? <span>&middot; {formatRuntime(title.runtime)}</span> : null}
            </div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title.title}</h1>
            {title.genres.length > 0 && <p className="mt-2 text-sm text-muted">{title.genres.join(" · ")}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <RatingBadge voteAverage={title.voteAverage} />
            {title.status === "WATCHED" && title.rating ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Your rating</span>
                <StarRating value={title.rating} readOnly size={16} />
              </div>
            ) : null}
          </div>

          {title.overview && <p className="max-w-2xl text-sm leading-relaxed text-muted">{title.overview}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Watch
            </a>
            <ShareButton
              url={`/t/${title.id}`}
              title={title.title}
              text={
                title.status === "WATCHED" && title.rating
                  ? `I watched ${title.title} — ${title.rating}★`
                  : `Check out ${title.title}`
              }
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-16 sm:px-8">
        <ReviewSection
          tmdbId={title.tmdbId}
          mediaType={title.mediaType}
          initialReviews={reviews}
          ratingHint={title.status === "WATCHED" ? title.rating : null}
        />
      </div>
    </div>
  );
}
