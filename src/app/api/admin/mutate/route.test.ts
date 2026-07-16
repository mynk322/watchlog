import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/admin-mutate", () => {
  class AdminMutateError extends Error {}
  return { adminMutate: vi.fn(), AdminMutateError };
});

import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin";
import { adminMutate } from "@/lib/admin-mutate";
import { POST } from "./route";

const authMock = auth as unknown as Mock;
const isAdminMock = isAdmin as unknown as Mock;
const mutateMock = adminMutate as unknown as Mock;
const req = (body: unknown) => ({ json: async () => body }) as unknown as Parameters<typeof POST>[0];

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "admin" });
  isAdminMock.mockResolvedValue(true);
});

describe("POST /api/admin/mutate", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await POST(req({ op: "delete", model: "title", where: { id: "t" } }))).status).toBe(401);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("403s a signed-in non-admin", async () => {
    isAdminMock.mockResolvedValue(false);
    expect((await POST(req({ op: "delete", model: "title", where: { id: "t" } }))).status).toBe(403);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("400s on an invalid op", async () => {
    expect((await POST(req({ op: "drop", model: "title", where: {} }))).status).toBe(400);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("performs the mutation for the admin", async () => {
    mutateMock.mockResolvedValue({ count: 1 });
    const res = await POST(req({ op: "delete", model: "title", where: { id: "t1" } }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, count: 1 });
    expect(mutateMock).toHaveBeenCalledWith({ op: "delete", model: "title", where: { id: "t1" } });
  });
});
