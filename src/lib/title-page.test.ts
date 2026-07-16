import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { title: { findUnique: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/tmdb", () => ({ getDetails: vi.fn(), getCredits: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getDetails, getCredits } from "@/lib/tmdb";
import { resolveBaseTitle } from "./title-page";
import { titleRefFromTmdb, titleHref, parseTitleRef } from "./tmdb-shared";

const titleMock = prisma.title as unknown as Record<string, Mock>;
const detailsMock = getDetails as unknown as Mock;
const creditsMock = getCredits as unknown as Mock;

const row = (over: Record<string, unknown> = {}) => ({
  id: "row-cuid",
  tmdbId: 550,
  mediaType: "MOVIE",
  title: "Fight Club",
  releaseYear: 1999,
  posterUrl: "/p.jpg",
  backdropUrl: "/b.jpg",
  overview: "…",
  genres: ["Drama"],
  voteAverage: 8.4,
  runtime: 139,
  watchUrl: null,
  topCast: [{ id: 1, name: "Ed", character: "Narrator", profilePath: null }],
  directors: [{ id: 2, name: "Fincher", role: "Director", profilePath: null }],
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("tmdb ref helpers", () => {
  it("round-trips a movie/tv ref", () => {
    expect(titleRefFromTmdb(550, "MOVIE")).toBe("tmdb-movie-550");
    expect(titleRefFromTmdb(1399, "TV")).toBe("tmdb-tv-1399");
    expect(parseTitleRef("tmdb-movie-550")).toEqual({ tmdbId: 550, mediaType: "MOVIE" });
    expect(parseTitleRef("tmdb-tv-1399")).toEqual({ tmdbId: 1399, mediaType: "TV" });
  });

  it("builds an href", () => {
    expect(titleHref(550, "MOVIE")).toBe("/t/tmdb-movie-550");
  });

  it("treats a cuid (not a tmdb ref) as null", () => {
    expect(parseTitleRef("clx123abc")).toBeNull();
    expect(parseTitleRef("tmdb-movie-")).toBeNull();
    expect(parseTitleRef("tmdb-film-5")).toBeNull();
  });
});

describe("resolveBaseTitle", () => {
  it("looks up a plain id as a Title row cuid and returns its metadata", async () => {
    titleMock.findUnique.mockResolvedValueOnce(row());
    const base = await resolveBaseTitle("row-cuid");
    expect(titleMock.findUnique).toHaveBeenCalledWith({ where: { id: "row-cuid" } });
    expect(titleMock.findFirst).not.toHaveBeenCalled();
    expect(base).toMatchObject({ id: "row-cuid", tmdbId: 550, title: "Fight Club" });
  });

  it("returns null when a cuid matches no row", async () => {
    titleMock.findUnique.mockResolvedValueOnce(null);
    expect(await resolveBaseTitle("missing")).toBeNull();
  });

  it("reuses any stored row for a tmdb ref (no TMDB call) when one exists", async () => {
    titleMock.findFirst.mockResolvedValueOnce(row({ id: "someones-row" }));
    const base = await resolveBaseTitle("tmdb-movie-550");
    expect(titleMock.findFirst).toHaveBeenCalledWith({ where: { tmdbId: 550, mediaType: "MOVIE" } });
    expect(detailsMock).not.toHaveBeenCalled();
    expect(base).toMatchObject({ id: "someones-row", tmdbId: 550 });
  });

  it("fetches live from TMDB for a tmdb ref no one has stored (movie → credits directors)", async () => {
    titleMock.findFirst.mockResolvedValueOnce(null);
    detailsMock.mockResolvedValueOnce({
      title: "New Movie", releaseYear: 2026, posterUrl: "/n.jpg", backdropUrl: null,
      overview: "o", genres: ["Sci-Fi"], voteAverage: 7, runtime: 120, watchUrl: null, creators: [],
    });
    creditsMock.mockResolvedValueOnce({
      cast: [{ id: 9, name: "A", character: "B", profilePath: null }],
      directors: [{ id: 10, name: "Dir", role: "Director", profilePath: null }],
    });
    const base = await resolveBaseTitle("tmdb-movie-777");
    expect(base).toMatchObject({ id: "tmdb-movie-777", tmdbId: 777, title: "New Movie" });
    expect(base?.directors).toEqual([{ id: 10, name: "Dir", role: "Director", profilePath: null }]);
  });

  it("uses TV creators as directors for a tmdb TV ref", async () => {
    titleMock.findFirst.mockResolvedValueOnce(null);
    detailsMock.mockResolvedValueOnce({
      title: "Show", releaseYear: 2020, posterUrl: null, backdropUrl: null, overview: "",
      genres: [], voteAverage: 8, runtime: null, watchUrl: null,
      creators: [{ id: 3, name: "Creator", role: "Creator", profilePath: null }],
    });
    creditsMock.mockResolvedValueOnce({ cast: [], directors: [] });
    const base = await resolveBaseTitle("tmdb-tv-1399");
    expect(base?.directors).toEqual([{ id: 3, name: "Creator", role: "Creator", profilePath: null }]);
  });

  it("returns null when TMDB has no such title (bad id)", async () => {
    titleMock.findFirst.mockResolvedValueOnce(null);
    detailsMock.mockRejectedValueOnce(new Error("TMDB request failed (404)"));
    creditsMock.mockRejectedValueOnce(new Error("TMDB request failed (404)"));
    expect(await resolveBaseTitle("tmdb-movie-999999999")).toBeNull();
  });
});
