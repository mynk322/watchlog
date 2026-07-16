import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dismissSuggestion } from "@/lib/suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await dismissSuggestion(userId, id);
  if (!ok) return Response.json({ error: "Suggestion not found" }, { status: 404 });
  return Response.json({ dismissed: true });
}
