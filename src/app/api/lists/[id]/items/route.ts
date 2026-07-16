import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addToList, removeFromList, reorderList, MAX_ITEMS_PER_LIST } from "@/lib/lists";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];

function parseTitle(body: unknown): { tmdbId: number; mediaType: MediaType } | null {
  const b = body as { tmdbId?: unknown; mediaType?: unknown };
  const tmdbId = Number(b?.tmdbId);
  const mediaType = b?.mediaType as MediaType;
  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) return null;
  return { tmdbId, mediaType };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = parseTitle(body);
  if (!title) return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
  const note = typeof body?.note === "string" ? body.note : null;

  const result = await addToList(userId, id, title.tmdbId, title.mediaType, note);
  if (result === "not-owner") return Response.json({ error: "List not found" }, { status: 404 });
  if (result === "at-limit") {
    return Response.json({ error: `A list can hold up to ${MAX_ITEMS_PER_LIST} titles` }, { status: 409 });
  }
  return Response.json({ added: result === "added", already: result === "already" });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = parseTitle(body);
  if (!title) return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });

  const ok = await removeFromList(userId, id, title.tmdbId, title.mediaType);
  if (!ok) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ removed: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const order = Array.isArray(body?.order) ? body.order.filter((x: unknown): x is string => typeof x === "string") : null;
  if (!order) return Response.json({ error: "order must be an array of item ids" }, { status: 400 });

  const ok = await reorderList(userId, id, order);
  if (!ok) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ reordered: true });
}
