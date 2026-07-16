import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  isValidBio,
  isValidDisplayName,
  isValidHandle,
  normalizeHandle,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const data: { displayName?: string; handle?: string; bio?: string | null } = {};

  if (body?.displayName !== undefined) {
    if (!isValidDisplayName(body.displayName)) {
      return Response.json({ error: `Display name must be 1–${DISPLAY_NAME_MAX_LENGTH} characters` }, { status: 400 });
    }
    data.displayName = body.displayName.trim();
  }

  if (body?.handle !== undefined) {
    const handle = typeof body.handle === "string" ? normalizeHandle(body.handle) : "";
    if (!isValidHandle(handle)) {
      return Response.json(
        { error: `Handle must be ${HANDLE_MIN_LENGTH}–${HANDLE_MAX_LENGTH} characters: lowercase letters, numbers, and hyphens` },
        { status: 400 }
      );
    }
    data.handle = handle;
  }

  if (body?.bio !== undefined) {
    if (!isValidBio(body.bio)) {
      return Response.json({ error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer` }, { status: 400 });
    }
    // Empty/whitespace bio clears it (stored as null).
    const trimmed = body.bio.trim();
    data.bio = trimmed.length > 0 ? trimmed : null;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "provide displayName, handle, and/or bio to update" }, { status: 400 });
  }

  // A profile row may not exist yet (created lazily on first review) — make sure there's one to update.
  await ensureProfile(userId);

  try {
    const profile = await prisma.profile.update({ where: { userId }, data });
    return Response.json({ profile: { displayName: profile.displayName, handle: profile.handle } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That handle is already taken" }, { status: 409 });
    }
    console.error("[PATCH /api/profile] update failed", err);
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
