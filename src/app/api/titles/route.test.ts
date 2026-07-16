import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/titles", () => ({ upsertTitleForUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { title: { findMany: vi.fn() } } }));
// toTitleDTO needs a full TitleModel (Date fields); stub it so we can assert on plain shapes.
vi.mock("@/lib/dto", () => ({ toTitleDTO: vi.fn((t: { id: string }) => ({ id: t.id })) }));
vi.mock("@/lib/activity", () => ({ recordActivity: vi.fn() }));
vi.mock("@/lib/profile", () => ({ ensureProfile: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { upsertTitleForUser } from "@/lib/titles";
import { GET, POST } from "./route";

const authMock = auth as unknown as Mock;
const upsertMock = upsertTitleForUser as unknown as Mock;
const titleMock = prisma.title as unknown as Record<string, Mock>;

function getReq(qs: string) {
  return { nextUrl: { searchParams: new URLSearchParams(qs) } } as unknown as Parameters<typeof GET>[0];
}
function postReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "u1" });
});

describe("GET /api/titles", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(getReq("status=WATCHLIST"));
    expect(res.status).toBe(401);
  });

  it("400s for an invalid status", async () => {
    const res = await GET(getReq("status=NONSENSE"));
    expect(res.status).toBe(400);
  });

  it("returns the user's titles for a valid status", async () => {
    titleMock.findMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
    const res = await GET(getReq("status=WATCHLIST"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ titles: [{ id: "t1" }, { id: "t2" }] });
    expect(titleMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "WATCHLIST", userId: "u1" } })
    );
  });
});

describe("POST /api/titles", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(postReq({ tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" }));
    expect(res.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s for a missing/invalid payload", async () => {
    expect((await POST(postReq({ mediaType: "MOVIE", status: "WATCHLIST" }))).status).toBe(400);
    expect((await POST(postReq({ tmdbId: 1, mediaType: "BOOK", status: "WATCHLIST" }))).status).toBe(400);
    expect((await POST(postReq({ tmdbId: 1, mediaType: "MOVIE", status: "SOON" }))).status).toBe(400);
  });

  it("201s and delegates to upsertTitleForUser on success", async () => {
    upsertMock.mockResolvedValue({ id: "t9" });
    const res = await POST(postReq({ tmdbId: 42, mediaType: "TV", status: "WATCHED" }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ title: { id: "t9" } });
    expect(upsertMock).toHaveBeenCalledWith("u1", { tmdbId: 42, mediaType: "TV", status: "WATCHED" });
  });

  it("502s when TMDB enrichment fails", async () => {
    upsertMock.mockRejectedValue(new Error("tmdb"));
    const res = await POST(postReq({ tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" }));
    expect(res.status).toBe(502);
  });
});
