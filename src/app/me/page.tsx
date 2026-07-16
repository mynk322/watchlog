import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * Stable "my profile" entry point. Profiles are created lazily (on a first review), so a user
 * may not have one yet and the client can't know their handle — this resolves both by ensuring
 * the profile exists server-side, then redirecting to the canonical /u/[handle].
 */
export default async function MyProfileRedirect() {
  const { userId } = await auth.protect();
  const profile = await ensureProfile(userId);
  redirect(`/u/${profile.handle}`);
}
