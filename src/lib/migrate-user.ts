import "server-only";
import { prisma } from "./prisma";

export interface MigrationCounts {
  titles: number;
  reviews: number;
  reviewLikes: number;
  comments: number;
  favorites: number;
  notifications: number;
  userSettings: number;
  profile: number;
}

/**
 * Re-keys every row owned by `fromUserId` to `toUserId` — used to move a user's data from an old
 * Clerk userId (e.g. a dev instance) to a new one (production). Runs in one transaction and is
 * conflict-safe: where a unique constraint could collide (title/review/like/favorite/follow the
 * target already has, or a target Profile/UserSettings), the target's colliding row is dropped so
 * the source's (the real data being migrated) wins. Idempotent — a second run moves nothing.
 */
export async function migrateUserData(fromUserId: string, toUserId: string): Promise<MigrationCounts> {
  if (!fromUserId || !toUserId) throw new Error("fromUserId and toUserId are required");
  if (fromUserId === toUserId) throw new Error("fromUserId and toUserId must differ");

  return prisma.$transaction(async (tx) => {
    // Title — unique(tmdbId, mediaType, userId)
    await tx.$executeRaw`DELETE FROM "Title" WHERE "userId" = ${toUserId} AND ("tmdbId", "mediaType") IN (SELECT "tmdbId", "mediaType" FROM "Title" WHERE "userId" = ${fromUserId})`;
    const titles = await tx.$executeRaw`UPDATE "Title" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // Review — unique(tmdbId, mediaType, userId)
    await tx.$executeRaw`DELETE FROM "Review" WHERE "userId" = ${toUserId} AND ("tmdbId", "mediaType") IN (SELECT "tmdbId", "mediaType" FROM "Review" WHERE "userId" = ${fromUserId})`;
    const reviews = await tx.$executeRaw`UPDATE "Review" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // ReviewLike — PK(userId, reviewId)
    await tx.$executeRaw`DELETE FROM "ReviewLike" WHERE "userId" = ${toUserId} AND "reviewId" IN (SELECT "reviewId" FROM "ReviewLike" WHERE "userId" = ${fromUserId})`;
    const reviewLikes = await tx.$executeRaw`UPDATE "ReviewLike" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // Comment — id PK, userId not unique
    const comments = await tx.$executeRaw`UPDATE "Comment" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // ProfileFavorite — PK(userId, tmdbId, mediaType)
    await tx.$executeRaw`DELETE FROM "ProfileFavorite" WHERE "userId" = ${toUserId} AND ("tmdbId", "mediaType") IN (SELECT "tmdbId", "mediaType" FROM "ProfileFavorite" WHERE "userId" = ${fromUserId})`;
    const favorites = await tx.$executeRaw`UPDATE "ProfileFavorite" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // Follow — PK(followerId, followingId), two references to re-key; drop dups and any self-follow
    await tx.$executeRaw`DELETE FROM "Follow" WHERE "followerId" = ${toUserId} AND "followingId" IN (SELECT "followingId" FROM "Follow" WHERE "followerId" = ${fromUserId})`;
    await tx.$executeRaw`UPDATE "Follow" SET "followerId" = ${toUserId} WHERE "followerId" = ${fromUserId}`;
    await tx.$executeRaw`DELETE FROM "Follow" WHERE "followingId" = ${toUserId} AND "followerId" IN (SELECT "followerId" FROM "Follow" WHERE "followingId" = ${fromUserId})`;
    await tx.$executeRaw`UPDATE "Follow" SET "followingId" = ${toUserId} WHERE "followingId" = ${fromUserId}`;
    await tx.$executeRaw`DELETE FROM "Follow" WHERE "followerId" = ${toUserId} AND "followingId" = ${toUserId}`;

    // Notification — id PK; re-key recipient + actor, then drop any now-self notifications
    const notifications = await tx.$executeRaw`UPDATE "Notification" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;
    await tx.$executeRaw`UPDATE "Notification" SET "actorId" = ${toUserId} WHERE "actorId" = ${fromUserId}`;
    await tx.$executeRaw`DELETE FROM "Notification" WHERE "userId" = ${toUserId} AND "actorId" = ${toUserId}`;

    // UserSettings — PK userId; keep the source's (the real account's) settings
    await tx.$executeRaw`DELETE FROM "UserSettings" WHERE "userId" = ${toUserId}`;
    const userSettings = await tx.$executeRaw`UPDATE "UserSettings" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    // Profile — PK userId, handle unique; keep the source's profile (its handle/bio/displayName)
    await tx.$executeRaw`DELETE FROM "Profile" WHERE "userId" = ${toUserId}`;
    const profile = await tx.$executeRaw`UPDATE "Profile" SET "userId" = ${toUserId} WHERE "userId" = ${fromUserId}`;

    return { titles, reviews, reviewLikes, comments, favorites, notifications, userSettings, profile };
  });
}
