import { auth } from "@clerk/nextjs/server";
import { getWatchStats } from "@/lib/stats";
import { StatTile } from "@/components/stat-tile";
import { StatCard } from "@/components/stat-card";
import { SplitBar } from "@/components/split-bar";
import { BarChart } from "@/components/bar-chart";
import { PeopleList } from "@/components/people-list";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { userId } = await auth.protect();
  const stats = await getWatchStats(userId);
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

  const hasPeopleData = stats.topCast.length > 0 || stats.topDirectors.length > 0;

  return (
    <div className="flex flex-col gap-14 px-4 py-14 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Your taste in numbers</h1>
        <p className="mt-2 text-sm text-muted">A breakdown of everything you&rsquo;ve watched.</p>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Movies watched" value={String(stats.moviesWatched)} />
          <StatTile label="Series watched" value={String(stats.seriesWatched)} />
          <StatTile label="Hours watched (est.)" value={stats.estimatedHours.toLocaleString()} />
          <StatTile label="Average rating" value={stats.averageRating ? `${stats.averageRating.toFixed(1)}★` : "—"} />
          <StatTile label="Longest streak" value={stats.longestStreakDays ? `${stats.longestStreakDays}d` : "—"} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Your collection</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard title="Movies vs series">
            <SplitBar
              segments={[
                { label: "Movies", value: stats.moviesWatched, color: "accent" },
                { label: "Series", value: stats.seriesWatched, color: "chart-blue" },
              ]}
            />
          </StatCard>
          {stats.ratingDistribution.length > 0 && (
            <StatCard title="Your ratings">
              <BarChart items={stats.ratingDistribution} color="gold" />
            </StatCard>
          )}
          {stats.genreBreakdown.length > 0 && (
            <StatCard title="Genres">
              <BarChart items={stats.genreBreakdown} color="accent" />
            </StatCard>
          )}
          {stats.titlesByYear.length > 0 && (
            <StatCard title="Titles by release year">
              <BarChart items={stats.titlesByYear} color="chart-blue" />
            </StatCard>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">When you watch</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard title="By month">
            <BarChart items={stats.byMonth} color="chart-blue" />
          </StatCard>
          <StatCard title="By day of week">
            <BarChart items={stats.byDayOfWeek} color="accent" />
          </StatCard>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Who you watch</h2>
        {hasPeopleData ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {stats.topCast.length > 0 && (
              <StatCard title="Top actors">
                <PeopleList people={stats.topCast} color="accent" />
              </StatCard>
            )}
            {stats.topDirectors.length > 0 && (
              <StatCard title="Top directors & creators">
                <PeopleList people={stats.topDirectors} color="gold" />
              </StatCard>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Still syncing cast &amp; crew data for your collection — check back after the next refresh.
          </p>
        )}
      </section>
    </div>
  );
}
