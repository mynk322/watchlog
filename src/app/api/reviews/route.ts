import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureProfile, resolveReviewAuthors } from "@/lib/profile";
import { toReviewDTO } from "@/lib/dto";
import { getReviewsForTitle } from "@/lib/reviews";
import { isValidRating } from "@/lib/validation";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];
const MAX_BODY_LENGTH = 4000;

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"));
  const mediaType = request.nextUrl.searchParams.get("mediaType") as MediaType | null;
  if (!Number.isInteger(tmdbId) || !mediaType || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
  }

  // Reviews are visible to every signed-in user, not just the author — intentionally not
  // scoped by userId, unlike every other query in this codebase.
  const reviews = await getReviewsForTitle(tmdbId, mediaType, userId);
  return Response.json({ reviews });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  const reviewBody = typeof body?.body === "string" ? body.body.trim() : "";
  const rating = body?.rating ?? null;

  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
  }
  if (!reviewBody || reviewBody.length > MAX_BODY_LENGTH) {
    return Response.json({ error: `body must be 1-${MAX_BODY_LENGTH} characters` }, { status: 400 });
  }
  if (rating !== null && !isValidRating(rating)) {
    return Response.json({ error: "rating must be null or a multiple of 0.5 between 0.5 and 5" }, { status: 400 });
  }

  await ensureProfile(userId);

  const review = await prisma.review.upsert({
    where: { tmdbId_mediaType_userId: { tmdbId, mediaType, userId } },
    create: { userId, tmdbId, mediaType, rating, body: reviewBody },
    update: { rating, body: reviewBody },
  });

  const authors = await resolveReviewAuthors([userId]);
  return Response.json({ review: toReviewDTO(review, authors.get(userId)!, userId) }, { status: 201 });
}
