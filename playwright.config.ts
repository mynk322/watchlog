import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Clerk keys live in .env.local; DATABASE_URL etc. in .env. Load both for global setup + the app.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global.setup.ts",
  fullyParallel: false, // the social flows share seeded users and follow state
  workers: 1,
  // Headroom for Next dev's first-hit route compilation when the whole suite runs cold.
  // No retries: the social spec is serial with non-idempotent steps (comment creation), so a
  // mid-group retry would double-create and fail — better to re-run the suite than auto-retry.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Run against a production build on a dedicated port (3100), not `next dev`. Prod has no
  // per-route JIT compilation, so the full suite runs reliably under load; port 3100 also avoids
  // clashing with a `next dev` a developer may have on 3000.
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/sign-in",
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
