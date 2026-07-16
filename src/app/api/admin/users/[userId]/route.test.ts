import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn(), getAdminUserDetail: vi.fn(), deleteUserEverything: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { isAdmin, getAdminUserDetail, deleteUserEverything } from "@/lib/admin";
import { GET, DELETE } from "./route";

const authMock = auth as unknown as Mock;
const isAdminMock = isAdmin as unknown as Mock;
const ctx = (userId: string) => ({ params: Promise.resolve({ userId }) });
const request = {} as Parameters<typeof GET>[0];

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "admin" });
  isAdminMock.mockResolvedValue(true);
});

describe("admin users/[userId]", () => {
  it("GET 403s a non-admin", async () => {
    isAdminMock.mockResolvedValue(false);
    expect((await GET(request, ctx("u1"))).status).toBe(403);
  });

  it("GET returns the user detail for the admin", async () => {
    (getAdminUserDetail as Mock).mockResolvedValue({ userId: "u1", titles: [] });
    const res = await GET(request, ctx("u1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ detail: { userId: "u1" } });
  });

  it("DELETE 401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await DELETE(request, ctx("u1"))).status).toBe(401);
    expect(deleteUserEverything).not.toHaveBeenCalled();
  });

  it("DELETE refuses to delete your own admin account", async () => {
    const res = await DELETE(request, ctx("admin"));
    expect(res.status).toBe(400);
    expect(deleteUserEverything).not.toHaveBeenCalled();
  });

  it("DELETE wipes another user for the admin", async () => {
    (deleteUserEverything as Mock).mockResolvedValue({ clerkDeleted: true });
    const res = await DELETE(request, ctx("victim"));
    expect(res.status).toBe(200);
    expect(deleteUserEverything).toHaveBeenCalledWith("victim");
    await expect(res.json()).resolves.toMatchObject({ ok: true, clerkDeleted: true });
  });
});
