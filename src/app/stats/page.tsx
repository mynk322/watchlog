import { getWatchStats } from "@/lib/stats";
import { StatTile } from "@/components/stat-tile";
import { SplitBar } from "@/components/split-bar";
import { BarChart } from "@/components/bar-chart";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getWatchStats();
  const totalWatched = stats.moviesWatched + stats.seriesWatched;

  if (totalWatched === 0) {
    return (
      <div className="px-4 py-14 sm:px-8">
        <h1 className="text-3xl font-bold text-foreground">Your taste in numbers</h1>
        <p className="mt-3 text-sm text-muted">
          Mark a few titles as watched and this page fills in with genre breakdowns, a year timeline, and your
          rating habits.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 px-4 py-14 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Your taste in numbers</h1>
        <p className="mt-2 text-sm text-muted">A breakdown of everything you&rsquo;ve watched.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Movies watched" value={String(stats.moviesWatched)} />
        <StatTile label="Series watched" value={String(stats.seriesWatched)} />
        <StatTile label="Hours watched (est.)" value={stats.estimatedHours.toLocaleString()} />
        <StatTile label="Average rating" value={stats.averageRating ? `${stats.averageRating.toFixed(1)}★` : "—"} />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Movies vs series</h2>
        <SplitBar
          segments={[
            { label: "Movies", value: stats.moviesWatched, color: "accent" },
            { label: "Series", value: stats.seriesWatched, color: "chart-blue" },
          ]}
        />
      </section>

      {stats.genreBreakdown.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Genres</h2>
          <BarChart items={stats.genreBreakdown} color="accent" />
        </section>
      )}

      {stats.titlesByYear.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Titles by release year</h2>
          <BarChart items={stats.titlesByYear} color="chart-blue" />
        </section>
      )}

      {stats.ratingDistribution.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Your ratings</h2>
          <BarChart items={stats.ratingDistribution} color="gold" />
        </section>
      )}
    </div>
  );
}
