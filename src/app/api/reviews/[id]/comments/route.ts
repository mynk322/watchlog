import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { getCommentsForReview, createComment, MAX_COMMENT_LENGTH } from "@/lib/comments";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comments = await getCommentsForReview(id, userId);
  return Response.json({ comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > MAX_COMMENT_LENGTH) {
    return Response.json({ error: `Comment must be 1–${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
  }

  await ensureProfile(userId); // give the commenter an in-app identity before their first comment
  const comment = await createComment(id, userId, body);
  // Notify the review's author about the new comment.
  const review = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
  if (review) await createNotification({ userId: review.userId, actorId: userId, type: "COMMENT", reviewId: id });
  return Response.json({ comment }, { status: 201 });
}
