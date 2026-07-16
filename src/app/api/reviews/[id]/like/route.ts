import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { likeReview, unlikeReview } from "@/lib/likes";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await likeReview(userId, id);
  // Notify the review's author that their review was liked.
  const review = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
  if (review) await createNotification({ userId: review.userId, actorId: userId, type: "LIKE", reviewId: id });
  return Response.json({ liked: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await unlikeReview(userId, id);
  return Response.json({ liked: false });
}
