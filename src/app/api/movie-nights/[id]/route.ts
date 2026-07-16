import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { closeMovieNight, deleteMovieNight } from "@/lib/movie-nights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.action !== "close") return Response.json({ error: "Unsupported action" }, { status: 400 });

  const ok = await closeMovieNight(userId, id);
  if (!ok) return Response.json({ error: "Movie night not found" }, { status: 404 });
  return Response.json({ closed: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteMovieNight(userId, id);
  if (!ok) return Response.json({ error: "Movie night not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
