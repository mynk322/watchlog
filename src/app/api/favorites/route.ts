import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addFavorite, removeFavorite, MAX_FAVORITES } from "@/lib/favorites";
import { recordActivity } from "@/lib/activity";
import { resolveTitleMeta } from "@/lib/title-meta";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];

async function parse(request: NextRequest): Promise<{ tmdbId: number; mediaType: MediaType } | null> {
  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) return null;
  return { tmdbId, mediaType };
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const input = await parse(request);
  if (!input) return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });

  const result = await addFavorite(userId, input.tmdbId, input.mediaType);
  if (result === "no-title") {
    return Response.json({ error: "Add this title to your library before favoriting it" }, { status: 404 });
  }
  if (result === "at-limit") {
    return Response.json({ error: `You can favorite up to ${MAX_FAVORITES} titles` }, { status: 409 });
  }

  const meta = await resolveTitleMeta(input.tmdbId, input.mediaType);
  await recordActivity({
    userId,
    type: "FAVORITED",
    tmdbId: input.tmdbId,
    mediaType: input.mediaType,
    title: meta.title,
    posterUrl: meta.posterUrl,
    releaseYear: meta.releaseYear,
  });

  return Response.json({ favorited: true });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const input = await parse(request);
  if (!input) return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });

  await removeFavorite(userId, input.tmdbId, input.mediaType);
  return Response.json({ favorited: false });
}
