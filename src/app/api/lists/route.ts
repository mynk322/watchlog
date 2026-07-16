import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createList, getListsForUser, MAX_LISTS_PER_USER } from "@/lib/lists";
import { ensureProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const lists = await getListsForUser(userId, userId);
  return Response.json({ lists });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const description = typeof body?.description === "string" ? body.description : null;

  await ensureProfile(userId); // list author surfaces on their profile / in /people
  const result = await createList(userId, name, description);
  if (result === "invalid") return Response.json({ error: "A list name is required" }, { status: 400 });
  if (result === "at-limit") {
    return Response.json({ error: `You can create up to ${MAX_LISTS_PER_USER} lists` }, { status: 409 });
  }
  return Response.json({ id: result.id }, { status: 201 });
}
