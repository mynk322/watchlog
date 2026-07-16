import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/tmdb", () => ({ searchTitles: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { title: { findMany: vi.fn() } } }));

import { auth } from "@clerk/nextjs/server";
import { searchTitles } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const authMock = auth as unknown as Mock;
const searchMock = searchTitles as unknown as Mock;
const titleMock = prisma.title as unknown as Record<string, Mock>;

function req(qs: string) {
  return { nextUrl: { searchParams: new URLSearchParams(qs) } } as unknown as Parameters<typeof GET>[0];
}

const TMDB_RESULT = {
  tmdbId: 155,
  mediaType: "movie",
  title: "The Dark Knight",
  releaseYear: 2008,
  posterUrl: "/p.jpg",
  backdropUrl: "/b.jpg",
  overview: "Batman",
  voteAverage: 8.5,
  popularity: 99,
};

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockResolvedValue([TMDB_RESULT]);
});

describe("GET /api/search", () => {
  it("returns results for a logged-out visitor without touching the DB (alreadyAdded null)", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(req("q=batman"));
    expect(res.status).toBe(200);
    const { results } = await res.json();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ tmdbId: 155, mediaType: "MOVIE", alreadyAdded: null });
    expect(titleMock.findMany).not.toHaveBeenCalled();
  });

  it("annotates already-added state from the user's collection when signed in", async () => {
    authMock.mockResolvedValue({ userId: "u1" });
    titleMock.findMany.mockResolvedValue([{ tmdbId: 155, mediaType: "MOVIE", status: "WATCHLIST" }]);
    const res = await GET(req("q=batman"));
    const { results } = await res.json();
    expect(results[0].alreadyAdded).toBe("WATCHLIST");
    expect(titleMock.findMany).toHaveBeenCalledTimes(1);
  });

  it("short-circuits an empty query", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(req("q="));
    await expect(res.json()).resolves.toEqual({ results: [] });
    expect(searchMock).not.toHaveBeenCalled();
  });
});
