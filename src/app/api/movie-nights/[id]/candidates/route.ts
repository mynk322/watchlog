import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addCandidate, removeCandidate, MAX_CANDIDATES } from "@/lib/movie-nights";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
  }

  const result = await addCandidate(userId, id, tmdbId, mediaType);
  if (result === "not-found") return Response.json({ error: "Movie night not found" }, { status: 404 });
  if (result === "closed") return Response.json({ error: "This movie night is closed" }, { status: 409 });
  if (result === "at-limit") return Response.json({ error: `Up to ${MAX_CANDIDATES} titles` }, { status: 409 });
  return Response.json({ added: result === "added", already: result === "already" }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const candidateId = typeof body?.candidateId === "string" ? body.candidateId : "";
  if (!candidateId) return Response.json({ error: "candidateId is required" }, { status: 400 });

  const ok = await removeCandidate(userId, candidateId);
  if (!ok) return Response.json({ error: "Can't remove that candidate" }, { status: 400 });
  return Response.json({ removed: true });
}
