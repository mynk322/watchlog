import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { follow, unfollow } from "@/lib/follows";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reads and validates the target userId from the request body. */
async function targetUserId(request: NextRequest): Promise<string | null> {
  const body = await request.json().catch(() => null);
  const id = body?.userId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const target = await targetUserId(request);
  if (!target) return Response.json({ error: "userId is required" }, { status: 400 });
  if (target === userId) return Response.json({ error: "You can't follow yourself" }, { status: 400 });

  await follow(userId, target);
  await createNotification({ userId: target, actorId: userId, type: "FOLLOW" });
  return Response.json({ isFollowing: true });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const target = await targetUserId(request);
  if (!target) return Response.json({ error: "userId is required" }, { status: 400 });

  await unfollow(userId, target);
  return Response.json({ isFollowing: false });
}
