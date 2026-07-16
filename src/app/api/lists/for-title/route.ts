import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getListMembershipForTitle } from "@/lib/lists";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];

/** GET /api/lists/for-title?tmdbId=&mediaType= — the viewer's lists, flagged with membership. */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"));
  const mediaType = request.nextUrl.searchParams.get("mediaType") as MediaType;
  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
  }

  const lists = await getListMembershipForTitle(userId, tmdbId, mediaType);
  return Response.json({ lists });
}
