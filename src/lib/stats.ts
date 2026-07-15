import "server-only";
import { prisma } from "./prisma";

export interface WatchStats {
  moviesWatched: number;
  seriesWatched: number;
  estimatedHours: number;
  averageRating: number | null;
  genreBreakdown: { label: string; value: number }[];
  titlesByYear: { label: string; value: number }[];
  ratingDistribution: { label: string; value: number }[];
}

const TOP_GENRE_COUNT = 8;

export async function getWatchStats(): Promise<WatchStats> {
  const [movieAgg, tvTitles, genreRows, yearRows, ratingRows, ratingAvg] = await Promise.all([
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

  return {
    moviesWatched: movieAgg._count,
    seriesWatched: tvTitles.length,
    estimatedHours,
    averageRating: ratingAvg._avg.rating,
    genreBreakdown,
    titlesByYear,
    ratingDistribution,
  };
}
