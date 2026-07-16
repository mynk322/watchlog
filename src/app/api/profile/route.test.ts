import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { update: vi.fn() } } }));
vi.mock("@/lib/profile", () => ({ ensureProfile: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PATCH } from "./route";

const authMock = auth as unknown as Mock;
const updateMock = prisma.profile.update as unknown as Mock;

function req(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof PATCH>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "me" });
});

describe("PATCH /api/profile", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await PATCH(req({ displayName: "X" }))).status).toBe(401);
  });

  it("400s when no fields are provided", async () => {
    expect((await PATCH(req({}))).status).toBe(400);
  });

  it("400s on an invalid handle", async () => {
    const res = await PATCH(req({ handle: "Bad Handle!" }));
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("normalizes the handle and saves valid input", async () => {
    updateMock.mockResolvedValue({ displayName: "Jane", handle: "jane-d" });
    const res = await PATCH(req({ displayName: "  Jane  ", handle: "Jane-D" }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { userId: "me" },
      data: { displayName: "Jane", handle: "jane-d" },
    });
  });

  it("409s when the handle is already taken", async () => {
    updateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" })
    );
    const res = await PATCH(req({ handle: "taken" }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "That handle is already taken" });
  });

  it("saves a trimmed bio", async () => {
    updateMock.mockResolvedValue({ displayName: "Me", handle: "me" });
    const res = await PATCH(req({ bio: "  Watches everything twice.  " }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ where: { userId: "me" }, data: { bio: "Watches everything twice." } });
  });

  it("clears the bio when given an empty string", async () => {
    updateMock.mockResolvedValue({ displayName: "Me", handle: "me" });
    await PATCH(req({ bio: "   " }));
    expect(updateMock).toHaveBeenCalledWith({ where: { userId: "me" }, data: { bio: null } });
  });

  it("400s on an over-long bio", async () => {
    const res = await PATCH(req({ bio: "x".repeat(301) }));
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
