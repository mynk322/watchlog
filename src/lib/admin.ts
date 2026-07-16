import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export const ADMIN_EMAIL = "mayankpadia50@gmail.com";

/** True only for the single admin account (matched by primary email). Used to gate every /admin surface. */
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
    return (primary?.emailAddress ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

export interface AdminUserCounts {
  titles: number;
  reviews: number;
  comments: number;
  likes: number;
  favorites: number;
  followers: number;
  following: number;
  notifications: number;
}

export interface AdminUserSummary {
  userId: string;
  email: string | null;
  clerkName: string | null;
  imageUrl: string | null;
  displayName: string | null;
  handle: string | null;
  counts: AdminUserCounts;
}

async function countBy(model: { groupBy: (args: unknown) => Promise<Array<Record<string, unknown>>> }, by: string) {
  const rows = (await model.groupBy({ by: [by], _count: { _all: true } })) as Array<{ _count: { _all: number } } & Record<string, string>>;
  const map = new Map<string, number>();
  for (const r of rows) map.set(r[by], r._count._all);
  return map;
}

/** All users that have any data or a profile, with identity (Clerk) + per-entity counts. */
export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  const [profiles, titleC, reviewC, commentC, likeC, favC, followerC, followingC, notifC] = await Promise.all([
    prisma.profile.findMany({ select: { userId: true, displayName: true, handle: true } }),
    countBy(prisma.title as never, "userId"),
    countBy(prisma.review as never, "userId"),
    countBy(prisma.comment as never, "userId"),
    countBy(prisma.reviewLike as never, "userId"),
    countBy(prisma.profileFavorite as never, "userId"),
    countBy(prisma.follow as never, "followingId"), // followers of X = rows where followingId = X
    countBy(prisma.follow as never, "followerId"), // following of X = rows where followerId = X
    countBy(prisma.notification as never, "userId"),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const ids = new Set<string>([
    ...profiles.map((p) => p.userId),
    ...titleC.keys(),
    ...reviewC.keys(),
    ...commentC.keys(),
    ...likeC.keys(),
    ...favC.keys(),
    ...followerC.keys(),
    ...followingC.keys(),
    ...notifC.keys(),
  ]);
  ids.delete(""); // guard against any null-coerced key

  const idList = [...ids];
  const clerk = await clerkClient();
  const clerkUsers = idList.length
    ? (await clerk.users.getUserList({ userId: idList, limit: Math.min(idList.length, 500) })).data
    : [];
  const clerkById = new Map(clerkUsers.map((u) => [u.id, u]));

  return idList
    .map((userId) => {
      const cu = clerkById.get(userId);
      const primaryEmail = cu?.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ?? null;
      const p = profileByUser.get(userId);
      return {
        userId,
        email: primaryEmail,
        clerkName: cu ? [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || null : null,
        imageUrl: cu?.imageUrl ?? null,
        displayName: p?.displayName ?? null,
        handle: p?.handle ?? null,
        counts: {
          titles: titleC.get(userId) ?? 0,
          reviews: reviewC.get(userId) ?? 0,
          comments: commentC.get(userId) ?? 0,
          likes: likeC.get(userId) ?? 0,
          favorites: favC.get(userId) ?? 0,
          followers: followerC.get(userId) ?? 0,
          following: followingC.get(userId) ?? 0,
          notifications: notifC.get(userId) ?? 0,
        },
      };
    })
    .sort((a, b) => b.counts.titles - a.counts.titles);
}

/** Full data for one user, for the admin detail page. */
export async function getAdminUserDetail(userId: string) {
  const [profile, settings, titles, reviews, comments, favorites, likes, following, followers, notifications] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.title.findMany({ where: { userId }, orderBy: { addedAt: "desc" } }),
      prisma.review.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.comment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.profileFavorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.reviewLike.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.follow.findMany({ where: { followerId: userId }, orderBy: { createdAt: "desc" } }),
      prisma.follow.findMany({ where: { followingId: userId }, orderBy: { createdAt: "desc" } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);

  let clerk: { email: string | null; name: string | null; imageUrl: string | null } | null = null;
  try {
    const cu = await (await clerkClient()).users.getUser(userId);
    const email = cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ?? null;
    clerk = { email, name: [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || null, imageUrl: cu.imageUrl };
  } catch {
    clerk = null; // user may not exist in this Clerk instance
  }

  return { userId, clerk, profile, settings, titles, reviews, comments, favorites, likes, following, followers, notifications };
}

/** Deletes every DB row owned by the user, in one transaction. Follows/notifications clean both sides. */
export async function deleteUserDbData(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.reviewLike.deleteMany({ where: { userId } }),
    prisma.comment.deleteMany({ where: { userId } }),
    prisma.profileFavorite.deleteMany({ where: { userId } }),
    prisma.review.deleteMany({ where: { userId } }),
    prisma.title.deleteMany({ where: { userId } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
    prisma.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } }),
    prisma.userSettings.deleteMany({ where: { userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
  ]);
}

/** Deletes all the user's DB data AND their Clerk account. Returns whether the Clerk delete succeeded. */
export async function deleteUserEverything(userId: string): Promise<{ clerkDeleted: boolean }> {
  await deleteUserDbData(userId);
  try {
    await (await clerkClient()).users.deleteUser(userId);
    return { clerkDeleted: true };
  } catch {
    return { clerkDeleted: false }; // DB already cleared; Clerk user may not exist / already gone
  }
}
