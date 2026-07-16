import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { resolveTitleMeta } from "./title-meta";
import type {
  MediaType,
  MovieNightCandidateDTO,
  MovieNightDTO,
  MovieNightStatus,
  MovieNightSummaryDTO,
} from "./types";

export const MAX_MOVIE_NIGHT_NAME = 100;
export const MAX_CANDIDATES = 50;

export type CreateMovieNightResult = { id: string } | "invalid";

export async function createMovieNight(hostUserId: string, name: string): Promise<CreateMovieNightResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_MOVIE_NIGHT_NAME) return "invalid";
  const mn = await prisma.movieNight.create({ data: { hostUserId, name: trimmed }, select: { id: true } });
  return { id: mn.id };
}

/** Closes a movie night (locks voting). Host only. */
export async function closeMovieNight(hostUserId: string, id: string): Promise<boolean> {
  const mn = await prisma.movieNight.findUnique({ where: { id }, select: { hostUserId: true } });
  if (!mn || mn.hostUserId !== hostUserId) return false;
  await prisma.movieNight.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  return true;
}

/** Deletes a movie night and all its candidates/votes. Host only. */
export async function deleteMovieNight(hostUserId: string, id: string): Promise<boolean> {
  const mn = await prisma.movieNight.findUnique({ where: { id }, select: { hostUserId: true } });
  if (!mn || mn.hostUserId !== hostUserId) return false;
  const candidates = await prisma.movieNightCandidate.findMany({ where: { movieNightId: id }, select: { id: true } });
  await prisma.$transaction([
    prisma.movieNightVote.deleteMany({ where: { candidateId: { in: candidates.map((c) => c.id) } } }),
    prisma.movieNightCandidate.deleteMany({ where: { movieNightId: id } }),
    prisma.movieNight.delete({ where: { id } }),
  ]);
  return true;
}

export type AddCandidateResult = "added" | "already" | "closed" | "not-found" | "at-limit";

/** Adds a candidate title to an open movie night. Anyone signed in may add. Idempotent per title. */
export async function addCandidate(
  userId: string,
  movieNightId: string,
  tmdbId: number,
  mediaType: MediaType
): Promise<AddCandidateResult> {
  const mn = await prisma.movieNight.findUnique({ where: { id: movieNightId }, select: { status: true } });
  if (!mn) return "not-found";
  if (mn.status !== "OPEN") return "closed";

  const existing = await prisma.movieNightCandidate.findUnique({
    where: { movieNightId_tmdbId_mediaType: { movieNightId, tmdbId, mediaType } },
    select: { id: true },
  });
  if (existing) return "already";

  const count = await prisma.movieNightCandidate.count({ where: { movieNightId } });
  if (count >= MAX_CANDIDATES) return "at-limit";

  const meta = await resolveTitleMeta(tmdbId, mediaType);
  await prisma.movieNightCandidate.create({
    data: {
      movieNightId,
      tmdbId,
      mediaType,
      title: meta.title,
      posterUrl: meta.posterUrl,
      releaseYear: meta.releaseYear,
      addedByUserId: userId,
    },
  });
  return "added";
}

/** Removes a candidate. Allowed for the movie-night host or whoever added the candidate. */
export async function removeCandidate(userId: string, candidateId: string): Promise<boolean> {
  const candidate = await prisma.movieNightCandidate.findUnique({
    where: { id: candidateId },
    select: { movieNightId: true, addedByUserId: true },
  });
  if (!candidate) return false;
  const mn = await prisma.movieNight.findUnique({
    where: { id: candidate.movieNightId },
    select: { hostUserId: true, status: true },
  });
  if (!mn || mn.status !== "OPEN") return false;
  if (userId !== candidate.addedByUserId && userId !== mn.hostUserId) return false;

  await prisma.$transaction([
    prisma.movieNightVote.deleteMany({ where: { candidateId } }),
    prisma.movieNightCandidate.delete({ where: { id: candidateId } }),
  ]);
  return true;
}

export type VoteResult = "voted" | "unvoted" | "closed" | "not-found";

/** Toggles the viewer's approval vote on a candidate. Only while the movie night is open. */
export async function toggleVote(userId: string, candidateId: string): Promise<VoteResult> {
  const candidate = await prisma.movieNightCandidate.findUnique({
    where: { id: candidateId },
    select: { movieNightId: true },
  });
  if (!candidate) return "not-found";
  const mn = await prisma.movieNight.findUnique({ where: { id: candidate.movieNightId }, select: { status: true } });
  if (!mn) return "not-found";
  if (mn.status !== "OPEN") return "closed";

  const existing = await prisma.movieNightVote.findUnique({
    where: { candidateId_userId: { candidateId, userId } },
  });
  if (existing) {
    await prisma.movieNightVote.delete({ where: { candidateId_userId: { candidateId, userId } } });
    return "unvoted";
  }
  await prisma.movieNightVote.create({ data: { candidateId, userId } });
  return "voted";
}

/** All movie nights, open ones first then most-recent, with a candidate count. */
export async function getMovieNights(): Promise<MovieNightSummaryDTO[]> {
  const nights = await prisma.movieNight.findMany({ orderBy: { createdAt: "desc" } });
  if (nights.length === 0) return [];

  const [authors, counts] = await Promise.all([
    resolveReviewAuthors(nights.map((n) => n.hostUserId)),
    prisma.movieNightCandidate.groupBy({
      by: ["movieNightId"],
      where: { movieNightId: { in: nights.map((n) => n.id) } },
      _count: { movieNightId: true },
    }),
  ]);
  const countByNight = new Map(counts.map((c) => [c.movieNightId, c._count.movieNightId]));

  return nights
    .map((n) => ({
      id: n.id,
      name: n.name,
      host: authors.get(n.hostUserId)!,
      status: n.status as MovieNightStatus,
      candidateCount: countByNight.get(n.id) ?? 0,
      createdAt: n.createdAt.toISOString(),
    }))
    // Open nights first, then by newest.
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "OPEN" ? -1 : 1));
}

/** A full movie night with candidates ranked by votes, the viewer's votes, and the winner if closed. */
export async function getMovieNight(id: string, viewerId: string | null): Promise<MovieNightDTO | null> {
  const mn = await prisma.movieNight.findUnique({ where: { id } });
  if (!mn) return null;

  const [candidates, host] = await Promise.all([
    prisma.movieNightCandidate.findMany({ where: { movieNightId: id }, orderBy: { createdAt: "asc" } }),
    resolveReviewAuthors([mn.hostUserId]),
  ]);

  const votes = candidates.length
    ? await prisma.movieNightVote.findMany({
        where: { candidateId: { in: candidates.map((c) => c.id) } },
        select: { candidateId: true, userId: true },
      })
    : [];
  const voteCountByCandidate = new Map<string, number>();
  const viewerVoted = new Set<string>();
  for (const v of votes) {
    voteCountByCandidate.set(v.candidateId, (voteCountByCandidate.get(v.candidateId) ?? 0) + 1);
    if (viewerId && v.userId === viewerId) viewerVoted.add(v.candidateId);
  }

  const key = (t: number, m: MediaType) => `${t}:${m}`;
  const linkTitles = candidates.length
    ? await prisma.title.findMany({
        where: { OR: candidates.map((c) => ({ tmdbId: c.tmdbId, mediaType: c.mediaType })) },
        select: { id: true, tmdbId: true, mediaType: true },
      })
    : [];
  const linkIdByKey = new Map<string, string>();
  for (const t of linkTitles) if (!linkIdByKey.has(key(t.tmdbId, t.mediaType))) linkIdByKey.set(key(t.tmdbId, t.mediaType), t.id);

  const dtos: MovieNightCandidateDTO[] = candidates
    .map((c) => ({
      id: c.id,
      tmdbId: c.tmdbId,
      mediaType: c.mediaType,
      title: c.title,
      posterUrl: c.posterUrl,
      releaseYear: c.releaseYear,
      titleId: linkIdByKey.get(key(c.tmdbId, c.mediaType)) ?? null,
      voteCount: voteCountByCandidate.get(c.id) ?? 0,
      votedByViewer: viewerVoted.has(c.id),
      addedByViewer: viewerId != null && c.addedByUserId === viewerId,
    }))
    // Most-voted first; ties keep insertion order (earliest added wins).
    .sort((a, b) => b.voteCount - a.voteCount);

  const winner = mn.status === "CLOSED" && dtos.length > 0 && dtos[0].voteCount > 0 ? dtos[0] : null;

  return {
    id: mn.id,
    name: mn.name,
    host: host.get(mn.hostUserId)!,
    status: mn.status as MovieNightStatus,
    isHost: viewerId === mn.hostUserId,
    createdAt: mn.createdAt.toISOString(),
    closedAt: mn.closedAt?.toISOString() ?? null,
    candidates: dtos,
    winner,
  };
}
