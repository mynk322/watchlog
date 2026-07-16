import Link from "next/link";
import Image from "next/image";
import { Film, Tv, Star, User } from "lucide-react";
import { HeroPosterWall } from "./hero-poster-wall";
import { getTrendingItems } from "@/lib/trending";
import { getRecentPublicReviews } from "@/lib/reviews";
import { listPeople } from "@/lib/people";
import { prisma } from "@/lib/prisma";
import type { RecentReviewDTO } from "@/lib/types";

function key(tmdbId: number, mediaType: string) {
  return `${tmdbId}:${mediaType}`;
}

/** The logged-out landing: a browsable showcase of trending titles, recent reviews, and people. */
export async function PublicHome() {
  const [trending, recent, people] = await Promise.all([
    getTrendingItems(),
    getRecentPublicReviews(9),
    listPeople(12),
  ]);

  const heroPosters = trending
    .filter((t) => t.posterUrl)
    .slice(0, 30)
    .map((t) => ({ id: t.id, url: t.posterUrl!, alt: t.title }));

  // Link a trending poster to the public /t/[id] page when some user has added it.
  const titleRows = trending.length
    ? await prisma.title.findMany({
        where: { OR: trending.map((t) => ({ tmdbId: t.tmdbId, mediaType: t.mediaType })) },
        select: { id: true, tmdbId: true, mediaType: true },
      })
    : [];
  const titleIdByKey = new Map<string, string>();
  for (const t of titleRows) {
    if (!titleIdByKey.has(key(t.tmdbId, t.mediaType))) titleIdByKey.set(key(t.tmdbId, t.mediaType), t.id);
  }

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[64vh] items-end overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_50%)]" />
        <HeroPosterWall posters={heroPosters} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent" />

        <div className="relative z-10 flex w-full flex-col gap-5 px-4 pb-14 pt-32 sm:px-8 sm:pb-20">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-6xl">
            Track what you watch. See what everyone&rsquo;s watching.
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Browse trending movies and series, read reviews from real people, and log your own — free.
            Search up top to explore, or sign up to start your collection.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Sign up free
            </Link>
            <Link
              href="/people"
              className="rounded-full border border-border bg-surface/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface-elevated"
            >
              Browse people
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-16 px-4 py-14 sm:px-8">
        {trending.length > 0 && (
          <section>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-foreground">Trending this week</h2>
              <span className="text-sm text-muted">Popular on TMDB</span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {trending.slice(0, 12).map((t) => {
                const id = titleIdByKey.get(key(t.tmdbId, t.mediaType));
                const MediaIcon = t.mediaType === "TV" ? Tv : Film;
                const poster = (
                  <div className="group relative aspect-2/3 overflow-hidden rounded-lg bg-surface-elevated">
                    {t.posterUrl ? (
                      <Image src={t.posterUrl} alt={t.title} fill sizes="160px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MediaIcon size={20} className="text-muted" />
                      </div>
                    )}
                  </div>
                );
                return (
                  <div key={`${t.tmdbId}:${t.mediaType}`} className="flex flex-col gap-1">
                    {id ? (
                      <Link href={`/t/${id}`} className="transition-opacity hover:opacity-80">
                        {poster}
                      </Link>
                    ) : (
                      poster
                    )}
                    <p className="truncate text-xs text-muted" title={t.title}>
                      {t.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-bold text-foreground">What people are watching</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((r) => (
                <RecentReviewCard key={r.id} review={r} />
              ))}
            </div>
          </section>
        )}

        {people.length > 0 && (
          <section>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-foreground">People on Watchlog</h2>
              <Link href="/people" className="text-sm text-accent hover:underline">
                See all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {people.map((p) => (
                <Link
                  key={p.userId}
                  href={`/u/${p.handle}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-surface-elevated"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the optimizer
                      <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User size={16} className="text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{p.displayName}</p>
                    <p className="truncate text-xs text-muted">@{p.handle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function RecentReviewCard({ review }: { review: RecentReviewDTO }) {
  const { title } = review;
  const MediaIcon = title.mediaType === "TV" ? Tv : Film;
  const card = (
    <div className="flex h-full gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-elevated">
      <div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
        {title.posterUrl ? (
          <Image src={title.posterUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MediaIcon size={16} className="text-muted" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title.title}</p>
        <p className="text-xs text-muted">
          @{review.author.handle}
          {review.rating != null && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-gold">
              <Star size={11} className="fill-gold" />
              {review.rating}
            </span>
          )}
        </p>
        <p className="mt-1.5 line-clamp-3 text-sm text-foreground">{review.body}</p>
      </div>
    </div>
  );
  return title.titleId ? (
    <Link href={`/t/${title.titleId}`} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}
