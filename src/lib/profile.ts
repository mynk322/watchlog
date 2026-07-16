import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

const MAX_HANDLE_ATTEMPTS = 20;

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return slug || "user";
}

/** Lazily creates a Profile the first time a user needs one (e.g. posting their first review) — no onboarding gate at sign-in. */
export async function ensureProfile(userId: string) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const displayName = user.fullName || user.username || user.firstName || "User";
  const baseHandle = slugify(user.username || user.firstName || `user-${userId.slice(-6)}`);

  let handle = baseHandle;
  for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt++) {
    try {
      return await prisma.profile.create({ data: { userId, displayName, handle } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Concurrent call already created this user's profile — use it.
        const raced = await prisma.profile.findUnique({ where: { userId } });
        if (raced) return raced;
        // Otherwise it was a handle collision with a different user — retry with a suffix.
        handle = `${baseHandle}-${attempt + 1}`;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Could not allocate a unique handle for user ${userId}`);
}

/** Local, no-Clerk-round-trip lookup for review/profile display name + handle. */
export async function resolveAuthors(userIds: string[]): Promise<Map<string, { displayName: string; handle: string }>> {
  if (userIds.length === 0) return new Map();
  const profiles = await prisma.profile.findMany({ where: { userId: { in: userIds } } });
  return new Map(profiles.map((p) => [p.userId, { displayName: p.displayName, handle: p.handle }]));
}

/** Batched Clerk lookup for avatars — resolved live rather than cached, since there's no webhook to keep a cached copy fresh. */
export async function resolveAvatars(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  try {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({ userId: userIds, limit: Math.min(userIds.length, 100) });
    return new Map(users.map((u) => [u.id, u.imageUrl]));
  } catch (err) {
    // Avatars are decorative and come from Clerk's Backend API (rate-limited). A hiccup there must
    // not 500 the page — fall back to no avatars (the UI shows a default icon).
    console.error("[resolveAvatars] Clerk lookup failed; rendering without avatars", err);
    return new Map();
  }
}

export interface ResolvedAuthor {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

export async function resolveReviewAuthors(userIds: string[]): Promise<Map<string, ResolvedAuthor>> {
  const uniqueIds = [...new Set(userIds)];
  const [authors, avatars] = await Promise.all([resolveAuthors(uniqueIds), resolveAvatars(uniqueIds)]);
  const result = new Map<string, ResolvedAuthor>();
  for (const id of uniqueIds) {
    const author = authors.get(id);
    result.set(id, {
      userId: id,
      displayName: author?.displayName ?? "User",
      handle: author?.handle ?? id,
      avatarUrl: avatars.get(id) ?? null,
    });
  }
  return result;
}
