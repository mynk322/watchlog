import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Delegates are captured at module load, so the mock must be defined before importing admin-mutate.
vi.mock("@/lib/prisma", () => {
  const d = () => ({ updateMany: vi.fn().mockResolvedValue({ count: 1 }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) });
  return {
    prisma: {
      title: d(), review: d(), comment: d(), notification: d(),
      profile: d(), userSettings: d(), profileFavorite: d(), reviewLike: d(), follow: d(),
    },
  };
});

import { prisma } from "@/lib/prisma";
import { adminMutate, AdminMutateError } from "@/lib/admin-mutate";

const title = prisma.title as unknown as Record<string, Mock>;
const follow = prisma.follow as unknown as Record<string, Mock>;

beforeEach(() => vi.clearAllMocks());

describe("adminMutate", () => {
  it("rejects an unknown model", async () => {
    await expect(adminMutate({ op: "delete", model: "secretKeys", where: { id: "x" } })).rejects.toBeInstanceOf(AdminMutateError);
  });

  it("rejects a where that isn't exactly the identifying keys", async () => {
    await expect(adminMutate({ op: "delete", model: "title", where: {} })).rejects.toBeInstanceOf(AdminMutateError);
    await expect(adminMutate({ op: "delete", model: "title", where: { id: "x", userId: "y" } })).rejects.toBeInstanceOf(AdminMutateError);
  });

  it("deletes a single-key row", async () => {
    await adminMutate({ op: "delete", model: "title", where: { id: "t1" } });
    expect(title.deleteMany).toHaveBeenCalledWith({ where: { id: "t1" } });
  });

  it("deletes a composite-key join row", async () => {
    await adminMutate({ op: "delete", model: "follow", where: { followerId: "a", followingId: "b" } });
    expect(follow.deleteMany).toHaveBeenCalledWith({ where: { followerId: "a", followingId: "b" } });
  });

  it("refuses to update a delete-only model", async () => {
    await expect(adminMutate({ op: "update", model: "follow", where: { followerId: "a", followingId: "b" }, data: { x: 1 } })).rejects.toBeInstanceOf(AdminMutateError);
  });

  it("drops non-editable fields and rejects when nothing editable remains", async () => {
    await expect(adminMutate({ op: "update", model: "title", where: { id: "t1" }, data: { userId: "hacked", createdAt: "x" } })).rejects.toBeInstanceOf(AdminMutateError);
  });

  it("updates only whitelisted fields", async () => {
    await adminMutate({ op: "update", model: "title", where: { id: "t1" }, data: { status: "WATCHLIST", rating: 4, userId: "nope" } });
    expect(title.updateMany).toHaveBeenCalledWith({ where: { id: "t1" }, data: { status: "WATCHLIST", rating: 4 } });
  });

  it("validates enums and types", async () => {
    await expect(adminMutate({ op: "update", model: "title", where: { id: "t1" }, data: { status: "BOGUS" } })).rejects.toBeInstanceOf(AdminMutateError);
    await expect(adminMutate({ op: "update", model: "review", where: { id: "r1" }, data: { rating: "five" } })).rejects.toBeInstanceOf(AdminMutateError);
  });
});
