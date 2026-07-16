import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TitleGrid } from "@/components/title-grid";
import { DiscoverRow } from "@/components/discover-row";
import { HeroPosterWall } from "@/components/hero-poster-wall";
import { PublicHome } from "@/components/public-home";

export const dynamic = "force-dynamic";

const HERO_POSTER_TARGET = 30;

async function getHeroTitle(userId: string) {
  return prisma.title.findFirst({
    where: { status: "WATCHED", backdropUrl: { not: null }, userId },
    orderBy: [{ watchedAt: "desc" }, { addedAt: "desc" }],
  });
}

async function getHeroPosters(userId: string) {
  const titleRows = await prisma.title.findMany({
    where: { posterUrl: { not: null }, userId },
    orderBy: [{ watchedAt: "desc" }, { addedAt: "desc" }],
    take: HERO_POSTER_TARGET,
    select: { id: true, posterUrl: true, title: true, tmdbId: true, mediaType: true },
  });
  const posters = titleRows.map((t) => ({ id: t.id, url: t.posterUrl!, alt: t.title }));
  if (posters.length >= HERO_POSTER_TARGET) return posters;

  const seen = new Set(titleRows.map((t) => `${t.tmdbId}-${t.mediaType}`));
  const trendingRows = await prisma.trendingItem.findMany({
    where: { posterUrl: { not: null } },
    orderBy: { voteAverage: "desc" },
    take: HERO_POSTER_TARGET,
    select: { id: true, posterUrl: true, title: true, tmdbId: true, mediaType: true },
  });
  const fillers = trendingRows
    .filter((t) => !seen.has(`${t.tmdbId}-${t.mediaType}`))
    .map((t) => ({ id: t.id, url: t.posterUrl!, alt: t.title }));

  return [...posters, ...fillers].slice(0, HERO_POSTER_TARGET);
}

export default async function Home() {
  const { userId } = await auth();
  // Logged-out visitors get a browsable public landing instead of a bounce to sign-in.
  if (!userId) return <PublicHome />;

  const [hero, heroPosters, settings] = await Promise.all([
    getHeroTitle(userId),
    getHeroPosters(userId),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[64vh] items-end overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_50%)]" />
        <HeroPosterWall posters={heroPosters} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent" />

        <div className="relative z-10 flex w-full flex-col gap-4 px-4 pb-14 pt-32 sm:px-8 sm:pb-20">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-6xl">
            Every movie and series you&rsquo;ve watched, in one place.
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Search to log what you&rsquo;ve seen, queue up what&rsquo;s next, and let the poster wall do the rest —
            sort it your way, refreshed automatically.
          </p>
          {hero && (
            <p className="mt-2 text-xs uppercase tracking-wide text-muted/80">
              Recently watched &middot; {hero.title} {hero.releaseYear ? `(${hero.releaseYear})` : ""}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-16 px-4 py-14 sm:px-8">
        <section id="watched" className="scroll-mt-24">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Watched</h2>
          <TitleGrid
            status="WATCHED"
            initialSortKey={settings?.watchedSortKey}
            emptyHint="Nothing logged yet — search above and mark something as watched."
          />
        </section>

        <section id="watchlist" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-foreground">Watchlist</h2>
            <span className="text-sm text-muted">Queued up for later</span>
          </div>
          <TitleGrid
            status="WATCHLIST"
            initialSortKey={settings?.watchlistSortKey}
            emptyHint="Your watchlist is empty — add something you're planning to watch."
          />
        </section>

        <section id="discover" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-foreground">Discover</h2>
            <span className="text-sm text-muted">Trending this week</span>
          </div>
          <DiscoverRow />
        </section>
      </div>
    </div>
  );
}
