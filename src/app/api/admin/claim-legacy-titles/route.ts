import type { NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "mayankpadia50@gmail.com";

/**
 * One-time migration: assigns every pre-existing Title row (from before multi-user
 * support) to the Clerk account signed up with the original owner's email. Safe to
 * call more than once — only ever touches rows where userId is still null.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ emailAddress: [ADMIN_EMAIL] });
  const admin = users[0];
  if (!admin) {
    return Response.json({ error: `No Clerk user found for ${ADMIN_EMAIL} — sign up first` }, { status: 404 });
  }

  const result = await prisma.title.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });

  return Response.json({ ok: true, claimedTitles: result.count, userId: admin.id });
}
