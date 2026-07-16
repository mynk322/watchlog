import { auth } from "@clerk/nextjs/server";
import { listPeople } from "@/lib/people";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/people — everyone with a profile except the requester, for recipient pickers. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const people = await listPeople();
  return Response.json({ people: people.filter((p) => p.userId !== userId) });
}
