import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/profile", () => ({
  resolveReviewAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(
      unique.map((id) => [id, { userId: id, displayName: `Name ${id}`, handle: `handle-${id}`, avatarUrl: null }])
    );
  }),
}));

import { prisma } from "@/lib/prisma";
import { createNotification, getNotifications, getUnreadCount, markAllRead } from "./notifications";

const nMock = prisma.notification as unknown as Record<string, Mock>;
const now = new Date("2026-07-16T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNotification", () => {
  it("ignores self-triggered events", async () => {
    await createNotification({ userId: "u1", actorId: "u1", type: "LIKE", reviewId: "r1" });
    expect(nMock.create).not.toHaveBeenCalled();
  });

  it("records a notification for a different recipient", async () => {
    nMock.create.mockResolvedValue({});
    await createNotification({ userId: "author", actorId: "liker", type: "LIKE", reviewId: "r1" });
    expect(nMock.create).toHaveBeenCalledWith({
      data: { userId: "author", actorId: "liker", type: "LIKE", reviewId: "r1" },
    });
  });

  it("defaults reviewId to null for follows", async () => {
    nMock.create.mockResolvedValue({});
    await createNotification({ userId: "author", actorId: "follower", type: "FOLLOW" });
    expect(nMock.create).toHaveBeenCalledWith({
      data: { userId: "author", actorId: "follower", type: "FOLLOW", reviewId: null },
    });
  });
});

describe("getNotifications", () => {
  it("resolves actor identities onto each row", async () => {
    nMock.findMany.mockResolvedValue([
      { id: "n1", userId: "me", actorId: "bob", type: "FOLLOW", reviewId: null, read: false, createdAt: now },
    ]);
    const list = await getNotifications("me");
    expect(list[0]).toMatchObject({ id: "n1", type: "FOLLOW", actor: { handle: "handle-bob" }, read: false });
  });
});

describe("getUnreadCount / markAllRead", () => {
  it("counts only unread", async () => {
    nMock.count.mockResolvedValue(3);
    expect(await getUnreadCount("me")).toBe(3);
    expect(nMock.count).toHaveBeenCalledWith({ where: { userId: "me", read: false } });
  });

  it("marks all unread as read", async () => {
    nMock.updateMany.mockResolvedValue({ count: 3 });
    await markAllRead("me");
    expect(nMock.updateMany).toHaveBeenCalledWith({ where: { userId: "me", read: false }, data: { read: true } });
  });
});
