import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { comment: { update: vi.fn(), delete: vi.fn() } } }));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PATCH, DELETE } from "./route";

const authMock = auth as unknown as Mock;
const commentMock = prisma.comment as unknown as Record<string, Mock>;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Parameters<typeof PATCH>[0];
const now = new Date("2026-07-16T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "viewer" });
});

describe("PATCH comment", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await PATCH(req({ body: "x" }), ctx("c1"))).status).toBe(401);
  });

  it("400s on empty body", async () => {
    expect((await PATCH(req({ body: "" }), ctx("c1"))).status).toBe(400);
  });

  it("updates own comment (scoped by userId)", async () => {
    commentMock.update.mockResolvedValue({ id: "c1", body: "edited", updatedAt: now });
    const res = await PATCH(req({ body: " edited " }), ctx("c1"));
    expect(res.status).toBe(200);
    expect(commentMock.update).toHaveBeenCalledWith({ where: { id: "c1", userId: "viewer" }, data: { body: "edited" } });
  });

  it("404s when the comment isn't the viewer's", async () => {
    commentMock.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "test" })
    );
    expect((await PATCH(req({ body: "x" }), ctx("c1"))).status).toBe(404);
  });
});

describe("DELETE comment", () => {
  it("204s on success", async () => {
    commentMock.delete.mockResolvedValue({});
    const res = await DELETE(req(null), ctx("c1"));
    expect(res.status).toBe(204);
    expect(commentMock.delete).toHaveBeenCalledWith({ where: { id: "c1", userId: "viewer" } });
  });

  it("404s for someone else's comment", async () => {
    commentMock.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "test" })
    );
    expect((await DELETE(req(null), ctx("c1"))).status).toBe(404);
  });
});
