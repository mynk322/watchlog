import "server-only";
import { prisma } from "./prisma";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

/**
 * Shared fixed-window rate limiter backed by Postgres, so the limit holds across all serverless
 * instances without sticky sessions. The per-window row is incremented atomically (upsert +
 * `increment`). Fails OPEN: if the counter store errors, the request is allowed rather than blocked
 * — this is a soft abuse throttle, not a hard security control.
 */
export async function rateLimit(
  subject: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const key = `${subject}:${windowStart}`;
  try {
    const row = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(resetAt) },
      update: { count: { increment: 1 } },
    });
    return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt };
  } catch {
    return { allowed: true, remaining: limit, resetAt };
  }
}

/** Deletes expired counter rows. Call periodically (e.g. from the cron refresh). */
export async function cleanupRateLimits(now: number = Date.now()): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch(() => {});
}
