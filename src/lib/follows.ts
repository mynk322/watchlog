import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import type { FollowStatsDTO, UserSummaryDTO } from "./types";

/** Follower/following counts for a profile, plus whether the viewer follows it. */
export async function getFollowStats(profileUserId: string, viewerId: string): Promise<FollowStatsDTO> {
  const [followerCount, followingCount, viewerFollow] = await Promise.all([
    prisma.follow.count({ where: { followingId: profileUserId } }),
    prisma.follow.count({ where: { followerId: profileUserId } }),
    viewerId === profileUserId
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
        }),
  ]);
  return { followerCount, followingCount, isFollowing: viewerFollow !== null };
}

export async function follow(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return; // can't follow yourself
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  });
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  await prisma.follow
    .delete({ where: { followerId_followingId: { followerId, followingId } } })
    .catch(() => {}); // deleting a non-existent follow is a no-op, not an error
}

/** Resolves a set of user ids into list rows, annotated with the viewer's follow state and self-flag. */
async function toUserSummaries(userIds: string[], viewerId: string): Promise<UserSummaryDTO[]> {
  if (userIds.length === 0) return [];

  const [authors, viewerFollows] = await Promise.all([
    resolveReviewAuthors(userIds),
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: userIds } },
      select: { followingId: true },
    }),
  ]);
  const followedByViewer = new Set(viewerFollows.map((f) => f.followingId));

  return userIds.map((id) => {
    const author = authors.get(id)!;
    return {
      userId: id,
      displayName: author.displayName,
      handle: author.handle,
      avatarUrl: author.avatarUrl,
      isFollowing: followedByViewer.has(id),
      isSelf: id === viewerId,
    };
  });
}

/** Users who follow the given profile, most recent first. */
export async function getFollowers(profileUserId: string, viewerId: string): Promise<UserSummaryDTO[]> {
  const rows = await prisma.follow.findMany({
    where: { followingId: profileUserId },
    orderBy: { createdAt: "desc" },
    select: { followerId: true },
  });
  return toUserSummaries(
    rows.map((r) => r.followerId),
    viewerId
  );
}

/** Users the given profile follows, most recent first. */
export async function getFollowing(profileUserId: string, viewerId: string): Promise<UserSummaryDTO[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: profileUserId },
    orderBy: { createdAt: "desc" },
    select: { followingId: true },
  });
  return toUserSummaries(
    rows.map((r) => r.followingId),
    viewerId
  );
}
