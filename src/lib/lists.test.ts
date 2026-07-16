import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    list: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    listItem: {
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    title: { findMany: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));
vi.mock("@/lib/tmdb", () => ({ getDetails: vi.fn() }));
vi.mock("@/lib/profile", () => ({ resolveReviewAuthors: vi.fn() }));
vi.mock("@/lib/activity", () => ({ recordActivity: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getDetails } from "@/lib/tmdb";
import { resolveReviewAuthors } from "@/lib/profile";
import {
  createList,
  addToList,
  removeFromList,
  reorderList,
  getListsForUser,
  getListMembershipForTitle,
  MAX_LISTS_PER_USER,
  MAX_ITEMS_PER_LIST,
} from "./lists";

const listMock = prisma.list as unknown as Record<string, Mock>;
const itemMock = prisma.listItem as unknown as Record<string, Mock>;
const titleMock = prisma.title as unknown as Record<string, Mock>;
const detailsMock = getDetails as unknown as Mock;
const authorsMock = resolveReviewAuthors as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createList", () => {
  it("rejects an empty name without touching the DB", async () => {
    expect(await createList("u", "   ", null)).toBe("invalid");
    expect(listMock.create).not.toHaveBeenCalled();
  });

  it("refuses to create past the per-user limit", async () => {
    listMock.count.mockResolvedValue(MAX_LISTS_PER_USER);
    expect(await createList("u", "New list", null)).toBe("at-limit");
    expect(listMock.create).not.toHaveBeenCalled();
  });

  it("creates and returns the id, trimming the name", async () => {
    listMock.count.mockResolvedValue(0);
    listMock.create.mockResolvedValue({ id: "list1" });
    expect(await createList("u", "  Movie night  ", null)).toEqual({ id: "list1" });
    expect(listMock.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: "Movie night" }) }));
  });
});

describe("addToList", () => {
  it("returns not-owner when the list belongs to someone else", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "other" });
    expect(await addToList("u", "list1", 1, "MOVIE")).toBe("not-owner");
    expect(itemMock.create).not.toHaveBeenCalled();
  });

  it("is idempotent — returns already when the title is present", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "u" });
    itemMock.findUnique.mockResolvedValue({ id: "existing" });
    expect(await addToList("u", "list1", 1, "MOVIE")).toBe("already");
    expect(itemMock.create).not.toHaveBeenCalled();
  });

  it("refuses past the per-list item limit", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "u" });
    itemMock.findUnique.mockResolvedValue(null);
    itemMock.count.mockResolvedValue(MAX_ITEMS_PER_LIST);
    expect(await addToList("u", "list1", 1, "MOVIE")).toBe("at-limit");
  });

  it("snapshots metadata from an existing Title row (preferring one with a poster) and appends at the end", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "u" });
    itemMock.findUnique.mockResolvedValue(null);
    itemMock.count.mockResolvedValue(2);
    titleMock.findMany.mockResolvedValue([
      { title: "Dune", posterUrl: null, releaseYear: 2021 },
      { title: "Dune", posterUrl: "/dune.jpg", releaseYear: 2021 },
    ]);
    itemMock.aggregate.mockResolvedValue({ _max: { position: 4 } });
    itemMock.create.mockResolvedValue({});
    listMock.update.mockResolvedValue({});

    expect(await addToList("u", "list1", 438631, "MOVIE")).toBe("added");
    expect(detailsMock).not.toHaveBeenCalled(); // resolved from DB, no TMDB call
    expect(itemMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ posterUrl: "/dune.jpg", position: 5 }),
    });
  });

  it("falls back to TMDB when no Title row exists", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "u" });
    itemMock.findUnique.mockResolvedValue(null);
    itemMock.count.mockResolvedValue(0);
    titleMock.findMany.mockResolvedValue([]);
    detailsMock.mockResolvedValue({ title: "Fresh", posterUrl: "/f.jpg", releaseYear: 2026 });
    itemMock.aggregate.mockResolvedValue({ _max: { position: null } });
    itemMock.create.mockResolvedValue({});
    listMock.update.mockResolvedValue({});

    expect(await addToList("u", "list1", 99, "TV")).toBe("added");
    expect(detailsMock).toHaveBeenCalledWith(99, "tv");
    expect(itemMock.create).toHaveBeenCalledWith({ data: expect.objectContaining({ title: "Fresh", position: 0 }) });
  });
});

describe("reorderList", () => {
  it("only reorders ids that belong to the list, in the given order", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "u" });
    itemMock.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    itemMock.update.mockResolvedValue({});
    listMock.update.mockResolvedValue({});

    expect(await reorderList("u", "list1", ["c", "zzz", "a"])).toBe(true);
    // "zzz" is filtered out; c→0, a→1.
    expect(itemMock.update).toHaveBeenCalledWith({ where: { id: "c" }, data: { position: 0 } });
    expect(itemMock.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 1 } });
    expect(itemMock.update).toHaveBeenCalledTimes(2);
  });
});

describe("removeFromList", () => {
  it("returns false for a list the user doesn't own", async () => {
    listMock.findUnique.mockResolvedValue({ userId: "other" });
    expect(await removeFromList("u", "list1", 1, "MOVIE")).toBe(false);
    expect(itemMock.delete).not.toHaveBeenCalled();
  });
});

describe("getListsForUser", () => {
  it("aggregates item counts and up to 4 preview posters (skipping null posters)", async () => {
    listMock.findMany.mockResolvedValue([
      { id: "l1", name: "A", description: null, updatedAt: new Date("2026-07-16T00:00:00Z") },
    ]);
    itemMock.findMany.mockResolvedValue([
      { listId: "l1", posterUrl: "/1.jpg" },
      { listId: "l1", posterUrl: null },
      { listId: "l1", posterUrl: "/2.jpg" },
    ]);

    const [summary] = await getListsForUser("owner", "owner");
    expect(summary.itemCount).toBe(3);
    expect(summary.previewPosters).toEqual(["/1.jpg", "/2.jpg"]);
    expect(summary.isOwn).toBe(true);
  });

  it("marks isOwn false for a different viewer", async () => {
    listMock.findMany.mockResolvedValue([
      { id: "l1", name: "A", description: null, updatedAt: new Date("2026-07-16T00:00:00Z") },
    ]);
    itemMock.findMany.mockResolvedValue([]);
    const [summary] = await getListsForUser("owner", "someone-else");
    expect(summary.isOwn).toBe(false);
  });
});

describe("getListMembershipForTitle", () => {
  it("flags which of the viewer's lists already contain the title", async () => {
    listMock.findMany.mockResolvedValue([
      { id: "l1", name: "Faves" },
      { id: "l2", name: "Later" },
    ]);
    itemMock.findMany.mockResolvedValue([{ listId: "l2" }]);

    const membership = await getListMembershipForTitle("u", 5, "MOVIE");
    expect(membership).toEqual([
      { id: "l1", name: "Faves", contains: false },
      { id: "l2", name: "Later", contains: true },
    ]);
  });
});

// resolveReviewAuthors is only exercised by getList; keep a reference so the mock is considered used.
void authorsMock;
