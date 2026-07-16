import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_COMMENT_LENGTH } from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > MAX_COMMENT_LENGTH) {
    return Response.json({ error: `Comment must be 1–${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
  }

  try {
    // Scoping the where to { id, userId } means another user's comment simply isn't found → 404.
    const comment = await prisma.comment.update({ where: { id, userId }, data: { body } });
    return Response.json({ comment: { id: comment.id, body: comment.body, updatedAt: comment.updatedAt.toISOString() } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }
    console.error("[PATCH /api/comments/[id]] update failed", err);
    return Response.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.comment.delete({ where: { id, userId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }
    console.error("[DELETE /api/comments/[id]] delete failed", err);
    return Response.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
