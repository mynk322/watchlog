import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { toTitleDTO } from "@/lib/dto";
import { upsertTitleForUser } from "@/lib/titles";
import type { MediaType, TitleStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];
const VALID_STATUSES: TitleStatus[] = ["WATCHED", "WATCHLIST"];

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status") as TitleStatus | null;
  if (!status || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "status must be WATCHED or WATCHLIST" }, { status: 400 });
  }

  const titles = await prisma.title.findMany({
    where: { status, userId },
    orderBy: [{ releaseYear: "desc" }, { title: "asc" }],
  });

  return Response.json({ titles: titles.map(toTitleDTO) });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType = body?.mediaType as MediaType;
  const status = body?.status as TitleStatus;

  if (!Number.isInteger(tmdbId) || !VALID_MEDIA_TYPES.includes(mediaType) || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "tmdbId, mediaType, and status are required" }, { status: 400 });
  }

  let title;
  try {
    title = await upsertTitleForUser(userId, { tmdbId, mediaType, status });
  } catch {
    return Response.json({ error: "Could not fetch title details from TMDB" }, { status: 502 });
  }

  return Response.json({ title: toTitleDTO(title) }, { status: 201 });
}
