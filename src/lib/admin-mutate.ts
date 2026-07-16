import "server-only";
import { prisma } from "./prisma";

type Delegate = { updateMany: (a: unknown) => Promise<{ count: number }>; deleteMany: (a: unknown) => Promise<{ count: number }> };

interface ModelSpec {
  delegate: Delegate;
  /** Fields that uniquely identify a row; the request `where` must contain exactly these. */
  whereKeys: string[];
  /** Fields an admin may update (empty = delete-only, e.g. join rows). */
  editable: string[];
}

// Whitelist — the ONLY models/fields the admin mutate endpoint can touch.
const MODELS: Record<string, ModelSpec> = {
  title: { delegate: prisma.title as never, whereKeys: ["id"], editable: ["status", "rating", "title", "watchUrl", "currentSeason", "currentEpisode"] },
  review: { delegate: prisma.review as never, whereKeys: ["id"], editable: ["rating", "body"] },
  comment: { delegate: prisma.comment as never, whereKeys: ["id"], editable: ["body"] },
  notification: { delegate: prisma.notification as never, whereKeys: ["id"], editable: ["read"] },
  profile: { delegate: prisma.profile as never, whereKeys: ["userId"], editable: ["displayName", "handle", "bio"] },
  userSettings: { delegate: prisma.userSettings as never, whereKeys: ["userId"], editable: ["theme", "watchedSortKey", "watchlistSortKey", "region"] },
  favorite: { delegate: prisma.profileFavorite as never, whereKeys: ["userId", "tmdbId", "mediaType"], editable: [] },
  like: { delegate: prisma.reviewLike as never, whereKeys: ["userId", "reviewId"], editable: [] },
  follow: { delegate: prisma.follow as never, whereKeys: ["followerId", "followingId"], editable: [] },
};

export const ADMIN_MODELS = Object.keys(MODELS);

export type AdminMutateInput =
  | { op: "delete"; model: string; where: Record<string, unknown> }
  | { op: "update"; model: string; where: Record<string, unknown>; data: Record<string, unknown> };

export type AdminMutateResult = { count: number };

/** Validates that `where` contains exactly the model's identifying keys (prevents broad matches). */
function validatedWhere(spec: ModelSpec, where: Record<string, unknown>): Record<string, unknown> {
  if (!where || typeof where !== "object") throw new AdminMutateError("where is required");
  const keys = Object.keys(where);
  if (keys.length !== spec.whereKeys.length || !spec.whereKeys.every((k) => k in where)) {
    throw new AdminMutateError(`where must have exactly: ${spec.whereKeys.join(", ")}`);
  }
  return where;
}

/** Keeps only editable fields; light validation for enums/booleans. */
function sanitizedData(spec: ModelSpec, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!spec.editable.includes(k)) continue;
    if (k === "status" && v !== "WATCHED" && v !== "WATCHLIST") throw new AdminMutateError("status must be WATCHED or WATCHLIST");
    if (k === "read" && typeof v !== "boolean") throw new AdminMutateError("read must be a boolean");
    if (k === "rating" && v !== null && typeof v !== "number") throw new AdminMutateError("rating must be a number or null");
    out[k] = v;
  }
  if (Object.keys(out).length === 0) throw new AdminMutateError("no editable fields provided");
  return out;
}

export class AdminMutateError extends Error {}

export async function adminMutate(input: AdminMutateInput): Promise<AdminMutateResult> {
  const spec = MODELS[input.model];
  if (!spec) throw new AdminMutateError(`unknown model: ${input.model}`);
  const where = validatedWhere(spec, input.where);

  if (input.op === "delete") {
    return spec.delegate.deleteMany({ where });
  }
  if (spec.editable.length === 0) throw new AdminMutateError(`${input.model} is delete-only`);
  const data = sanitizedData(spec, input.data);
  return spec.delegate.updateMany({ where, data });
}
