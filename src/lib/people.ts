import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";

export interface PersonDTO {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  reviewCount: number;
}

/**
 * Everyone with a public profile, most-reviewed first, for the /people directory. Uses an explicit
 * `select` so it doesn't depend on any specific Profile columns beyond the id.
 */
export async function listPeople(limit = 200): Promise<PersonDTO[]> {
  const profiles = await prisma.profile.findMany({ select: { userId: true }, take: limit });
  if (profiles.length === 0) return [];
  const ids = profiles.map((p) => p.userId);

  const [authors, counts] = await Promise.all([
    resolveReviewAuthors(ids),
    prisma.review.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { userId: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.userId, c._count.userId]));

  return ids
    .map((id) => {
      const author = authors.get(id)!;
      return {
        userId: id,
        displayName: author.displayName,
        handle: author.handle,
        avatarUrl: author.avatarUrl,
        reviewCount: countMap.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.reviewCount - a.reviewCount || a.displayName.localeCompare(b.displayName));
}
