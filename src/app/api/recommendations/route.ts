import { auth } from "@clerk/nextjs/server";
import { getRecommendationsForUser } from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { items, personalized } = await getRecommendationsForUser(userId);
  return Response.json({ items, personalized });
}
