import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendSuggestion } from "@/lib/suggestions";
import { ensureProfile } from "@/lib/profile";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const toUserId = typeof body?.toUserId === "string" ? body.toUserId : "";
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  const message = typeof body?.message === "string" ? body.message : null;
  if (!toUserId || !Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: "toUserId, tmdbId and mediaType are required" }, { status: 400 });
  }

  await ensureProfile(userId); // the sender is shown as the recommender in the recipient's inbox
  const result = await sendSuggestion(userId, toUserId, tmdbId, mediaType, message);
  if (result === "self") return Response.json({ error: "You can't recommend a title to yourself" }, { status: 400 });
  if (result === "no-recipient") return Response.json({ error: "Recipient not found" }, { status: 404 });
  if (result === "invalid") return Response.json({ error: "Message is too long" }, { status: 400 });
  return Response.json({ sent: true }, { status: 201 });
}
