import "server-only";
import { prisma } from "./prisma";
import type { CastMemberDTO, DirectorCreditDTO } from "./types";

export interface PersonStat {
  id: number;
  name: string;
  subtitle: string;
  profilePath: string | null;
  count: number;
}

export interface WatchStats {
  moviesWatched: number;
  seriesWatched: number;
  estimatedHours: number;
  averageRating: number | null;
  longestStreakDays: number;
  genreBreakdown: { label: string; value: number }[];
  titlesByYear: { label: string; value: number }[];
  ratingDistribution: { label: string; value: number }[];
  byMonth: { label: string; value: number }[];
  byDayOfWeek: { label: string; value: number }[];
  topCast: PersonStat[];
  topDirectors: PersonStat[];
}

const TOP_GENRE_COUNT = 8;
const TOP_PEOPLE_COUNT = 8;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function distributionByMonth(dates: Date[]) {
  const counts = new Array(12).fill(0);
  for (const d of dates) counts[d.getMonth()]++;
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

function distributionByDayOfWeek(dates: Date[]) {
  const counts = new Array(7).fill(0);
  for (const d of dates) {
    const day = d.getDay(); // 0 = Sunday
    counts[day === 0 ? 6 : day - 1]++;
  }
  return DAY_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

function longestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => Math.floor(d.getTime() / MS_PER_DAY)));
  let longest = 0;
  for (const day of days) {
    if (days.has(day - 1)) continue; // not the start of a run
    let run = 1;
    let cursor = day;
    while (days.has(cursor + 1)) {
      cursor++;
      run++;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

function topCastPeople(rows: { topCast: unknown }[]): PersonStat[] {
  const byId = new Map<number, PersonStat>();
  for (const row of rows) {
    const cast = row.topCast as CastMemberDTO[] | null;
    if (!cast) continue;
    for (const person of cast) {
      const existing = byId.get(person.id);
      if (existing) existing.count++;
      else byId.set(person.id, { id: person.id, name: person.name, subtitle: person.character, profilePath: person.profilePath, count: 1 });
    }
  }
  return [...byId.values()].sort((a, b) => b.count - a.count).slice(0, TOP_PEOPLE_COUNT);
}

function topDirectorPeople(rows: { directors: unknown }[]): PersonStat[] {
  const byId = new Map<number, PersonStat>();
  for (const row of rows) {
    const directors = row.directors as DirectorCreditDTO[] | null;
    if (!directors) continue;
    for (const person of directors) {
      const existing = byId.get(person.id);
      if (existing) existing.count++;
      else byId.set(person.id, { id: person.id, name: person.name, subtitle: person.role, profilePath: person.profilePath, count: 1 });
    }
  }
  return [...byId.values()].sort((a, b) => b.count - a.count).slice(0, TOP_PEOPLE_COUNT);
}

export async function getWatchStats(): Promise<WatchStats> {
  const [movieAgg, tvTitles, genreRows, yearRows, ratingRows, ratingAvg, peopleRows] = await Promise.all([
    prisma.title.aggregate({
      where: { status: "WATCHED", mediaType: "MOVIE" },
      _count: true,
      _sum: { runtime: true },
    }),
    prisma.title.findMany({
      where: { status: "WATCHED", mediaType: "TV" },
      select: { runtime: true, currentEpisode: true },
    }),
    prisma.$queryRaw<{ genre: string; count: bigint }[]>`
      SELECT unnest(genres) AS genre, count(*) AS count
      FROM "Title"
      WHERE status = 'WATCHED'
      GROUP BY genre
      ORDER BY count DESC
    `,
    prisma.title.groupBy({
      by: ["releaseYear"],
      where: { status: "WATCHED", releaseYear: { not: null } },
      _count: true,
    }),
    prisma.title.groupBy({
      by: ["rating"],
      where: { status: "WATCHED", rating: { not: null } },
      _count: true,
    }),
    prisma.title.aggregate({
      where: { status: "WATCHED", rating: { not: null } },
      _avg: { rating: true },
    }),
    prisma.title.findMany({
      where: { status: "WATCHED" },
      select: { watchedAt: true, topCast: true, directors: true },
    }),
  ]);

  const movieMinutes = movieAgg._sum.runtime ?? 0;
  const tvMinutes = tvTitles.reduce((sum, t) => sum + (t.runtime ?? 0) * (t.currentEpisode ?? 0), 0);
  const estimatedHours = Math.round((movieMinutes + tvMinutes) / 60);

  const sortedGenres = genreRows.map((r) => ({ label: r.genre, value: Number(r.count) }));
  const topGenres = sortedGenres.slice(0, TOP_GENRE_COUNT);
  const otherCount = sortedGenres.slice(TOP_GENRE_COUNT).reduce((sum, g) => sum + g.value, 0);
  const genreBreakdown = otherCount > 0 ? [...topGenres, { label: "Other", value: otherCount }] : topGenres;

  const titlesByYear = yearRows
    .map((r) => ({ label: String(r.releaseYear), value: r._count }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const ratingDistribution = ratingRows
    .map((r) => ({ label: `${r.rating}★`, value: r._count }))
    .sort((a, b) => parseFloat(a.label) - parseFloat(b.label));

  const watchedDates = peopleRows.map((r) => r.watchedAt).filter((d): d is Date => d !== null);

  return {
    moviesWatched: movieAgg._count,
    seriesWatched: tvTitles.length,
    estimatedHours,
    averageRating: ratingAvg._avg.rating,
    longestStreakDays: longestStreak(watchedDates),
    genreBreakdown,
    titlesByYear,
    ratingDistribution,
    byMonth: distributionByMonth(watchedDates),
    byDayOfWeek: distributionByDayOfWeek(watchedDates),
    topCast: topCastPeople(peopleRows),
    topDirectors: topDirectorPeople(peopleRows),
  };
}
