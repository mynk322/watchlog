import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follow: {
      count: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// resolveReviewAuthors is the only thing follows.ts pulls from profile; return a deterministic author per id.
vi.mock("@/lib/profile", () => ({
  resolveReviewAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(
      unique.map((id) => [id, { userId: id, displayName: `Name ${id}`, handle: `handle-${id}`, avatarUrl: null }])
    );
  }),
}));

import { prisma } from "@/lib/prisma";
import { follow, unfollow, getFollowStats, getFollowers, getFollowing } from "./follows";

const followMock = prisma.follow as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("follow", () => {
  it("is a no-op when following yourself", async () => {
    await follow("u1", "u1");
    expect(followMock.upsert).not.toHaveBeenCalled();
  });

  it("upserts (idempotent) for a real target", async () => {
    followMock.upsert.mockResolvedValue({});
    await follow("u1", "u2");
    expect(followMock.upsert).toHaveBeenCalledWith({
      where: { followerId_followingId: { followerId: "u1", followingId: "u2" } },
      create: { followerId: "u1", followingId: "u2" },
      update: {},
    });
  });
});

describe("unfollow", () => {
  it("deletes the edge", async () => {
    followMock.delete.mockResolvedValue({});
    await unfollow("u1", "u2");
    expect(followMock.delete).toHaveBeenCalledWith({
      where: { followerId_followingId: { followerId: "u1", followingId: "u2" } },
    });
  });

  it("swallows the error when the edge doesn't exist", async () => {
    followMock.delete.mockRejectedValue(new Error("Record to delete does not exist"));
    await expect(unfollow("u1", "nope")).resolves.toBeUndefined();
  });
});

describe("getFollowStats", () => {
  it("returns counts and isFollowing=true when the viewer follows the profile", async () => {
    followMock.count.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve(where.followingId ? 5 : 2)
    );
    followMock.findUnique.mockResolvedValue({ followerId: "viewer", followingId: "profile" });

    const stats = await getFollowStats("profile", "viewer");
    expect(stats).toEqual({ followerCount: 5, followingCount: 2, isFollowing: true });
  });

  it("never checks (or reports) a self-follow when viewing your own profile", async () => {
    followMock.count.mockResolvedValue(0);
    const stats = await getFollowStats("me", "me");
    expect(stats.isFollowing).toBe(false);
    expect(followMock.findUnique).not.toHaveBeenCalled();
  });
});

describe("getFollowers / getFollowing", () => {
  it("maps follower ids to summaries, flagging self and viewer's follows", async () => {
    followMock.findMany.mockImplementation(({ select }: { select: Record<string, boolean> }) => {
      // First call: followers of "profile". Second call (inside): viewer's own follows among those ids.
      if (select.followerId) return Promise.resolve([{ followerId: "alice" }, { followerId: "viewer" }]);
      return Promise.resolve([{ followingId: "alice" }]); // viewer follows alice
    });

    const followers = await getFollowers("profile", "viewer");
    expect(followers).toHaveLength(2);

    const alice = followers.find((u) => u.userId === "alice")!;
    expect(alice).toMatchObject({ handle: "handle-alice", isFollowing: true, isSelf: false });

    const self = followers.find((u) => u.userId === "viewer")!;
    expect(self).toMatchObject({ isSelf: true, isFollowing: false });
  });

  it("returns an empty list without extra queries when there are no follows", async () => {
    followMock.findMany.mockResolvedValueOnce([]); // no following rows
    const following = await getFollowing("profile", "viewer");
    expect(following).toEqual([]);
  });
});
