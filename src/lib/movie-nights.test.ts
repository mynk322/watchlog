import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    movieNight: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    movieNightCandidate: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    movieNightVote: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    title: { findMany: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));
vi.mock("@/lib/title-meta", () => ({ resolveTitleMeta: vi.fn() }));
vi.mock("@/lib/profile", () => ({ resolveReviewAuthors: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { resolveTitleMeta } from "@/lib/title-meta";
import { resolveReviewAuthors } from "@/lib/profile";
import { createMovieNight, addCandidate, toggleVote, closeMovieNight, getMovieNight } from "./movie-nights";

const mnMock = prisma.movieNight as unknown as Record<string, Mock>;
const candMock = prisma.movieNightCandidate as unknown as Record<string, Mock>;
const voteMock = prisma.movieNightVote as unknown as Record<string, Mock>;
const titleMock = prisma.title as unknown as Record<string, Mock>;
const metaMock = resolveTitleMeta as unknown as Mock;
const authorsMock = resolveReviewAuthors as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  authorsMock.mockResolvedValue(
    new Map([["host", { userId: "host", displayName: "Host", handle: "host", avatarUrl: null }]])
  );
});

describe("createMovieNight", () => {
  it("rejects an empty name", async () => {
    expect(await createMovieNight("host", "  ")).toBe("invalid");
    expect(mnMock.create).not.toHaveBeenCalled();
  });
});

describe("addCandidate", () => {
  it("returns not-found for a missing movie night", async () => {
    mnMock.findUnique.mockResolvedValue(null);
    expect(await addCandidate("u", "mn1", 1, "MOVIE")).toBe("not-found");
  });

  it("refuses to add to a closed movie night", async () => {
    mnMock.findUnique.mockResolvedValue({ status: "CLOSED" });
    expect(await addCandidate("u", "mn1", 1, "MOVIE")).toBe("closed");
  });

  it("is idempotent when the title is already a candidate", async () => {
    mnMock.findUnique.mockResolvedValue({ status: "OPEN" });
    candMock.findUnique.mockResolvedValue({ id: "c1" });
    expect(await addCandidate("u", "mn1", 1, "MOVIE")).toBe("already");
    expect(candMock.create).not.toHaveBeenCalled();
  });

  it("snapshots metadata and adds a new candidate", async () => {
    mnMock.findUnique.mockResolvedValue({ status: "OPEN" });
    candMock.findUnique.mockResolvedValue(null);
    candMock.count.mockResolvedValue(0);
    metaMock.mockResolvedValue({ title: "Dune", posterUrl: "/d.jpg", releaseYear: 2021 });
    candMock.create.mockResolvedValue({});
    expect(await addCandidate("u", "mn1", 438631, "MOVIE")).toBe("added");
    expect(candMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Dune", addedByUserId: "u" }),
    });
  });
});

describe("toggleVote", () => {
  it("won't vote on a closed movie night", async () => {
    candMock.findUnique.mockResolvedValue({ movieNightId: "mn1" });
    mnMock.findUnique.mockResolvedValue({ status: "CLOSED" });
    expect(await toggleVote("u", "c1")).toBe("closed");
  });

  it("adds a vote when none exists, removes it when it does", async () => {
    candMock.findUnique.mockResolvedValue({ movieNightId: "mn1" });
    mnMock.findUnique.mockResolvedValue({ status: "OPEN" });
    voteMock.findUnique.mockResolvedValueOnce(null);
    voteMock.create.mockResolvedValue({});
    expect(await toggleVote("u", "c1")).toBe("voted");

    voteMock.findUnique.mockResolvedValueOnce({ candidateId: "c1", userId: "u" });
    voteMock.delete.mockResolvedValue({});
    expect(await toggleVote("u", "c1")).toBe("unvoted");
  });
});

describe("closeMovieNight", () => {
  it("only the host can close", async () => {
    mnMock.findUnique.mockResolvedValue({ hostUserId: "someone-else" });
    expect(await closeMovieNight("host", "mn1")).toBe(false);
    expect(mnMock.update).not.toHaveBeenCalled();
  });
});

describe("getMovieNight", () => {
  it("ranks candidates by votes and names a winner once closed", async () => {
    mnMock.findUnique.mockResolvedValue({
      id: "mn1", hostUserId: "host", name: "Friday", status: "CLOSED",
      createdAt: new Date("2026-07-16T00:00:00Z"), closedAt: new Date("2026-07-16T01:00:00Z"),
    });
    candMock.findMany.mockResolvedValue([
      { id: "c1", tmdbId: 1, mediaType: "MOVIE", title: "A", posterUrl: null, releaseYear: 2020, addedByUserId: "host", createdAt: new Date() },
      { id: "c2", tmdbId: 2, mediaType: "MOVIE", title: "B", posterUrl: null, releaseYear: 2021, addedByUserId: "host", createdAt: new Date() },
    ]);
    voteMock.findMany.mockResolvedValue([
      { candidateId: "c2", userId: "x" },
      { candidateId: "c2", userId: "y" },
      { candidateId: "c1", userId: "x" },
    ]);
    titleMock.findMany.mockResolvedValue([]);

    const mn = await getMovieNight("mn1", "host");
    expect(mn!.candidates.map((c) => c.id)).toEqual(["c2", "c1"]); // B (2 votes) before A (1)
    expect(mn!.winner!.id).toBe("c2");
    expect(mn!.isHost).toBe(true);
  });

  it("has no winner while open", async () => {
    mnMock.findUnique.mockResolvedValue({
      id: "mn1", hostUserId: "host", name: "Friday", status: "OPEN",
      createdAt: new Date("2026-07-16T00:00:00Z"), closedAt: null,
    });
    candMock.findMany.mockResolvedValue([
      { id: "c1", tmdbId: 1, mediaType: "MOVIE", title: "A", posterUrl: null, releaseYear: 2020, addedByUserId: "host", createdAt: new Date() },
    ]);
    voteMock.findMany.mockResolvedValue([{ candidateId: "c1", userId: "x" }]);
    titleMock.findMany.mockResolvedValue([]);

    const mn = await getMovieNight("mn1", null);
    expect(mn!.winner).toBeNull();
  });
});
