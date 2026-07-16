import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { toggleVote } from "@/lib/movie-nights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/movie-nights/[id]/vote { candidateId } — toggles the viewer's approval vote. */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const candidateId = typeof body?.candidateId === "string" ? body.candidateId : "";
  if (!candidateId) return Response.json({ error: "candidateId is required" }, { status: 400 });

  const result = await toggleVote(userId, candidateId);
  if (result === "not-found") return Response.json({ error: "Candidate not found" }, { status: 404 });
  if (result === "closed") return Response.json({ error: "This movie night is closed" }, { status: 409 });
  return Response.json({ voted: result === "voted" });
}
