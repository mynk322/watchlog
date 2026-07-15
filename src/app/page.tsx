import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { TitleGrid } from "@/components/title-grid";
import { DiscoverRow } from "@/components/discover-row";

export const dynamic = "force-dynamic";

async function getHeroTitle() {
  return prisma.title.findFirst({
    where: { status: "WATCHED", backdropUrl: { not: null } },
    orderBy: [{ watchedAt: "desc" }, { addedAt: "desc" }],
  });
}

export default async function Home() {
  const hero = await getHeroTitle();

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[64vh] items-end overflow-hidden border-b border-border">
        {hero?.backdropUrl ? (
          <Image
            src={hero.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_50%)]" />
        )}
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
          <TitleGrid status="WATCHED" emptyHint="Nothing logged yet — search above and mark something as watched." />
        </section>

        <section id="watchlist" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-foreground">Watchlist</h2>
            <span className="text-sm text-muted">Queued up for later</span>
          </div>
          <TitleGrid status="WATCHLIST" emptyHint="Your watchlist is empty — add something you're planning to watch." />
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
