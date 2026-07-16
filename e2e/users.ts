// Seeded test users. `+clerk_test` addresses are Clerk's test emails — they never send real mail
// and are safe to create/reuse in a dev instance.
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
}

export const USERS: Record<"alice" | "bob", TestUser> = {
  alice: { email: "alice+clerk_test@example.com", password: "Watchlog-e2e-123!", firstName: "Alice" },
  bob: { email: "bob+clerk_test@example.com", password: "Watchlog-e2e-123!", firstName: "Bob" },
};
