import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findMany: vi.fn() }, review: { groupBy: vi.fn() } },
}));

vi.mock("@/lib/profile", () => ({
  resolveReviewAuthors: vi.fn(async (ids: string[]) => {
    const unique = [...new Set(ids)];
    return new Map(
      unique.map((id) => [id, { userId: id, displayName: `Name ${id}`, handle: `h-${id}`, avatarUrl: null }])
    );
  }),
}));

import { prisma } from "@/lib/prisma";
import { listPeople } from "./people";

const profileMock = prisma.profile as unknown as Record<string, Mock>;
const reviewMock = prisma.review as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listPeople", () => {
  it("returns [] and skips the count query when there are no profiles", async () => {
    profileMock.findMany.mockResolvedValue([]);
    expect(await listPeople()).toEqual([]);
    expect(reviewMock.groupBy).not.toHaveBeenCalled();
  });

  it("maps profiles to directory rows, sorted by review count (desc) then name", async () => {
    profileMock.findMany.mockResolvedValue([{ userId: "a" }, { userId: "b" }, { userId: "c" }]);
    reviewMock.groupBy.mockResolvedValue([
      { userId: "a", _count: { userId: 2 } },
      { userId: "b", _count: { userId: 5 } },
    ]);

    const people = await listPeople();
    expect(people.map((p) => p.userId)).toEqual(["b", "a", "c"]); // 5, 2, 0
    expect(people[0]).toMatchObject({ handle: "h-b", displayName: "Name b", reviewCount: 5, avatarUrl: null });
    expect(people[2]).toMatchObject({ userId: "c", reviewCount: 0 });
  });
});
