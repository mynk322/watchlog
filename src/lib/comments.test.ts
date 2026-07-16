import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
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
import { getCommentsForReview, createComment, deleteCommentsForReview, getCommentParticipants } from "./comments";

const commentMock = prisma.comment as unknown as Record<string, Mock>;
const now = new Date("2026-07-16T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCommentsForReview", () => {
  it("maps rows to DTOs with authors and marks the viewer's own comment", async () => {
    commentMock.findMany.mockResolvedValue([
      { id: "c1", reviewId: "r1", userId: "alice", body: "nice", createdAt: now, updatedAt: now },
      { id: "c2", reviewId: "r1", userId: "viewer", body: "mine", createdAt: now, updatedAt: now },
    ]);

    const comments = await getCommentsForReview("r1", "viewer");
    expect(comments).toHaveLength(2);
    expect(comments[0]).toMatchObject({ id: "c1", author: { handle: "handle-alice" }, isOwn: false });
    expect(comments[1]).toMatchObject({ id: "c2", isOwn: true });
    // oldest-first ordering is requested from the DB
    expect(commentMock.findMany).toHaveBeenCalledWith({ where: { reviewId: "r1" }, orderBy: { createdAt: "asc" } });
  });
});

describe("createComment", () => {
  it("persists and returns the DTO owned by the author", async () => {
    commentMock.create.mockResolvedValue({ id: "c9", reviewId: "r1", userId: "viewer", body: "hi", createdAt: now, updatedAt: now });
    const dto = await createComment("r1", "viewer", "hi");
    expect(commentMock.create).toHaveBeenCalledWith({ data: { reviewId: "r1", userId: "viewer", body: "hi" } });
    expect(dto).toMatchObject({ id: "c9", body: "hi", isOwn: true });
  });
});

describe("deleteCommentsForReview", () => {
  it("removes every comment on the review", async () => {
    commentMock.deleteMany.mockResolvedValue({ count: 2 });
    await deleteCommentsForReview("r1");
    expect(commentMock.deleteMany).toHaveBeenCalledWith({ where: { reviewId: "r1" } });
  });
});

describe("getCommentParticipants", () => {
  it("returns distinct commenter ids for the review", async () => {
    commentMock.findMany.mockResolvedValue([{ userId: "alice" }, { userId: "bob" }]);
    const ids = await getCommentParticipants("r1");
    expect(ids).toEqual(["alice", "bob"]);
    expect(commentMock.findMany).toHaveBeenCalledWith({
      where: { reviewId: "r1" },
      select: { userId: true },
      distinct: ["userId"],
    });
  });
});
