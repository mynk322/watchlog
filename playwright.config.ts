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
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: true, // a dev server is already running in this session
    timeout: 120_000,
  },
});
