import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveReviewAuthors } from "@/lib/profile";
import { toReviewDTO } from "@/lib/dto";
import { isValidRating } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 4000;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Prisma.ReviewUpdateInput = {};

  if (body?.body !== undefined) {
    const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!reviewBody || reviewBody.length > MAX_BODY_LENGTH) {
      return Response.json({ error: `body must be 1-${MAX_BODY_LENGTH} characters` }, { status: 400 });
    }
    data.body = reviewBody;
  }

  if (body?.rating !== undefined) {
    if (body.rating !== null && !isValidRating(body.rating)) {
      return Response.json({ error: "rating must be null or a multiple of 0.5 between 0.5 and 5" }, { status: 400 });
    }
    data.rating = body.rating;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "provide body and/or rating to update" }, { status: 400 });
  }

  try {
    const review = await prisma.review.update({ where: { id, userId }, data });
    const authors = await resolveReviewAuthors([userId]);
    return Response.json({ review: toReviewDTO(review, authors.get(userId)!, userId) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Review not found" }, { status: 404 });
    }
    console.error("[PATCH /api/reviews/[id]] update failed", err);
    return Response.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.review.delete({ where: { id, userId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Review not found" }, { status: 404 });
    }
    console.error("[DELETE /api/reviews/[id]] delete failed", err);
    return Response.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
