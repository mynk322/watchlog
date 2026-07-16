import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createMovieNight } from "@/lib/movie-nights";
import { ensureProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  await ensureProfile(userId); // host is shown by name on the movie night / index
  const result = await createMovieNight(userId, name);
  if (result === "invalid") return Response.json({ error: "A name is required" }, { status: 400 });
  return Response.json({ id: result.id }, { status: 201 });
}
