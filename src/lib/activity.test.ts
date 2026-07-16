import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follow: { findMany: vi.fn() },
    activity: { findMany: vi.fn(), create: vi.fn() },
    title: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/profile", () => ({ resolveReviewAuthors: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { resolveReviewAuthors } from "@/lib/profile";
import { getActivityFeed, recordActivity } from "./activity";

const followMock = prisma.follow as unknown as Record<string, Mock>;
const activityMock = prisma.activity as unknown as Record<string, Mock>;
const titleMock = prisma.title as unknown as Record<string, Mock>;
const authorsMock = resolveReviewAuthors as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getActivityFeed", () => {
  it("returns [] when the viewer follows no one (no activity query)", async () => {
    followMock.findMany.mockResolvedValue([]);
    expect(await getActivityFeed("me")).toEqual([]);
    expect(activityMock.findMany).not.toHaveBeenCalled();
  });

  it("enriches rows with actor identity and a linkable titleId", async () => {
    followMock.findMany.mockResolvedValue([{ followingId: "alice" }]);
    activityMock.findMany.mockResolvedValue([
      {
        id: "a1", userId: "alice", type: "WATCHED", tmdbId: 550, mediaType: "MOVIE",
        title: "Fight Club", posterUrl: "/fc.jpg", releaseYear: 1999, rating: 5, season: null,
        listId: null, listName: null, createdAt: new Date("2026-07-16T00:00:00Z"),
      },
    ]);
    authorsMock.mockResolvedValue(
      new Map([["alice", { userId: "alice", displayName: "Alice", handle: "alice", avatarUrl: null }]])
    );
    titleMock.findMany.mockResolvedValue([{ id: "title-fc", tmdbId: 550, mediaType: "MOVIE" }]);

    const [dto] = await getActivityFeed("me");
    expect(dto.type).toBe("WATCHED");
    expect(dto.actor.displayName).toBe("Alice");
    expect(dto.titleId).toBe("title-fc");
    expect(dto.rating).toBe(5);
  });

  it("skips the Title lookup for list-only activity", async () => {
    followMock.findMany.mockResolvedValue([{ followingId: "alice" }]);
    activityMock.findMany.mockResolvedValue([
      {
        id: "a2", userId: "alice", type: "LIST_CREATED", tmdbId: null, mediaType: null,
        title: null, posterUrl: null, releaseYear: null, rating: null, season: null,
        listId: "l1", listName: "Movie night", createdAt: new Date("2026-07-16T00:00:00Z"),
      },
    ]);
    authorsMock.mockResolvedValue(
      new Map([["alice", { userId: "alice", displayName: "Alice", handle: "alice", avatarUrl: null }]])
    );

    const [dto] = await getActivityFeed("me");
    expect(dto.listName).toBe("Movie night");
    expect(dto.titleId).toBeNull();
    expect(titleMock.findMany).not.toHaveBeenCalled();
  });
});

describe("recordActivity", () => {
  it("never throws — a DB failure is swallowed", async () => {
    activityMock.create.mockRejectedValue(new Error("db down"));
    await expect(recordActivity({ userId: "u", type: "WATCHED" })).resolves.toBeUndefined();
  });
});
