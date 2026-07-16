import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { likeReview, unlikeReview } from "@/lib/likes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await likeReview(userId, id);
  return Response.json({ liked: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await unlikeReview(userId, id);
  return Response.json({ liked: false });
}
