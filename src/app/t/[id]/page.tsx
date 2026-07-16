import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Film, Tv } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StarRating } from "@/components/star-rating";
import { RatingBadge } from "@/components/rating-badge";
import { ShareButton } from "@/components/share-button";
import { ReviewSection } from "@/components/review-section";
import { PublicReviewList } from "@/components/public-review-list";
import { FeaturesCarousel } from "@/components/features-carousel";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { FavoriteButton } from "@/components/favorite-button";
import { getReviewsForTitle } from "@/lib/reviews";
import { getPublicTitleReviews } from "@/lib/public-title";
import { isFavorited } from "@/lib/favorites";
import { formatRuntime } from "@/lib/utils";
import { googleSearchUrl } from "@/lib/tmdb-shared";

export const dynamic = "force-dynamic";

/**
 * A shared link's id points at one user's per-user Title row. We look it up UNSCOPED so anyone
 * (logged out, or a different signed-in user) can see the title's public metadata — that data is
 * not private. Personal fields (the viewer's own rating/status) come from getViewerTitle instead.
 */
async function getBaseTitle(id: string) {
  return prisma.title.findUnique({ where: { id } });
}

/** The current user's own row for this title, if they've added it — source of their rating/status. */
async function getViewerTitle(tmdbId: number, mediaType: "MOVIE" | "TV", userId: string) {
  return prisma.title.findUnique({
    where: { tmdbId_mediaType_userId: { tmdbId, mediaType, userId } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = await getBaseTitle(id);
  if (!title) return {};
  return {
    title: `${title.title} — Watchlog`,
    description: title.overview ?? undefined,
  };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [title, { userId }] = await Promise.all([getBaseTitle(id), auth()]);
  if (!title) notFound();

  const viewerTitle = userId ? await getViewerTitle(title.tmdbId, title.mediaType, userId) : null;
  // Only titles the viewer has added can be favorited.
  const favorited = userId && viewerTitle ? await isFavorited(userId, title.tmdbId, title.mediaType) : false;
  const href = title.watchUrl || googleSearchUrl(title.title, title.releaseYear);

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
            {viewerTitle?.status === "WATCHED" && viewerTitle.rating ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Your rating</span>
                <StarRating value={viewerTitle.rating} readOnly size={16} />
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
            {/* Signed-out visitors add to a local (browser) list; signed-in visitors who haven't
                already added this title get a real add. Owners manage it from their own grids. */}
            {!viewerTitle && (
              <AddToWatchlistButton
                tmdbId={title.tmdbId}
                mediaType={title.mediaType}
                title={title.title}
                posterUrl={title.posterUrl}
              />
            )}
            {viewerTitle && (
              <FavoriteButton tmdbId={title.tmdbId} mediaType={title.mediaType} initialFavorited={favorited} />
            )}
            <ShareButton
              url={`/t/${title.id}`}
              title={title.title}
              text={
                viewerTitle?.status === "WATCHED" && viewerTitle.rating
                  ? `I watched ${title.title} — ${viewerTitle.rating}★`
                  : `Check out ${title.title}`
              }
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-16 sm:px-8">
        {userId ? (
          <ReviewSection
            tmdbId={title.tmdbId}
            mediaType={title.mediaType}
            initialReviews={await getReviewsForTitle(title.tmdbId, title.mediaType, userId)}
            ratingHint={viewerTitle?.status === "WATCHED" ? viewerTitle.rating : null}
          />
        ) : (
          <PublicReviews tmdbId={title.tmdbId} mediaType={title.mediaType} titleName={title.title} />
        )}
      </div>
    </div>
  );
}

/** The logged-out review experience: read-only reviews (authors, ratings, likes, comments), a
 *  features carousel, and a sign-up CTA. */
async function PublicReviews({
  tmdbId,
  mediaType,
  titleName,
}: {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  titleName: string;
}) {
  const reviews = await getPublicTitleReviews(tmdbId, mediaType);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-foreground">Reviews</h2>
          <Link href="/sign-in" className="text-xs font-medium text-accent hover:underline">
            Sign in to like or comment
          </Link>
        </div>
        <PublicReviewList reviews={reviews} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-gradient-to-b from-accent/10 to-transparent p-6">
          <h2 className="text-lg font-bold text-foreground">Keep your own Watchlog</h2>
          <p className="mt-1 text-sm text-muted">
            Sign up to add <span className="text-foreground">{titleName}</span> to your watchlist, rate it, and write
            your own review.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/sign-up"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Sign up free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
            >
              Sign in
            </Link>
          </div>
        </div>
        <FeaturesCarousel />
      </aside>
    </div>
  );
}
