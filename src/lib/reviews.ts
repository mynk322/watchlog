import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { toReviewDTO } from "./dto";
import type { MediaType, ReviewDTO } from "./types";

export async function getReviewsForTitle(tmdbId: number, mediaType: MediaType, viewerId: string): Promise<ReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { tmdbId, mediaType },
    orderBy: { createdAt: "desc" },
  });
  const authors = await resolveReviewAuthors(reviews.map((r) => r.userId));
  return reviews.map((r) => toReviewDTO(r, authors.get(r.userId)!, viewerId));
}
