import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin, ADMIN_EMAIL } from "@/lib/admin";

const clerkMock = clerkClient as unknown as Mock;
function withGetUser(fn: Mock) {
  clerkMock.mockResolvedValue({ users: { getUser: fn } });
}

beforeEach(() => vi.clearAllMocks());

describe("isAdmin", () => {
  it("is false for no userId (and doesn't call Clerk)", async () => {
    expect(await isAdmin(null)).toBe(false);
    expect(clerkMock).not.toHaveBeenCalled();
  });

  it("is true only when the primary email is the admin email", async () => {
    withGetUser(vi.fn().mockResolvedValue({ primaryEmailAddressId: "e1", emailAddresses: [{ id: "e1", emailAddress: ADMIN_EMAIL }] }));
    expect(await isAdmin("user_admin")).toBe(true);
  });

  it("is false for a non-admin email", async () => {
    withGetUser(vi.fn().mockResolvedValue({ primaryEmailAddressId: "e1", emailAddresses: [{ id: "e1", emailAddress: "someone@else.com" }] }));
    expect(await isAdmin("user_other")).toBe(false);
  });

  it("is false when the admin email is present but not primary", async () => {
    withGetUser(vi.fn().mockResolvedValue({ primaryEmailAddressId: "e2", emailAddresses: [{ id: "e1", emailAddress: ADMIN_EMAIL }, { id: "e2", emailAddress: "primary@x.com" }] }));
    expect(await isAdmin("user_x")).toBe(false);
  });

  it("is false (not thrown) when the Clerk lookup errors", async () => {
    withGetUser(vi.fn().mockRejectedValue(new Error("clerk down")));
    expect(await isAdmin("user_x")).toBe(false);
  });
});
