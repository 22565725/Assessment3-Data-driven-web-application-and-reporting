import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the RSS Server end-to-end tests.
 *
 * The suite runs against a RUNNING deployment rather than starting its own
 * server. That is deliberate: the same tests then verify the local Docker
 * stack and the EC2 instance without modification, and what they check is
 * the system as actually deployed rather than a dev build that only exists
 * during the test run.
 *
 * Both addresses come from the environment because the two differ per
 * deployment - locally the client is on :3000, in Docker it is on :80, and
 * on EC2 it is a public hostname that changes on every Learner Lab restart.
 *
 *   WEB_BASE_URL   the RSS Client   (default http://localhost:3000)
 *   API_BASE_URL   the RSS Server   (default http://localhost:4080)
 *
 * Run:
 *   npx playwright test
 *   WEB_BASE_URL=http://localhost API_BASE_URL=http://localhost:4080 npx playwright test
 */

export const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://localhost:3000";
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4080";

export default defineConfig({
  testDir: "./tests",

  /* A failing assertion against a live server is usually a real failure, but
     a freshly restarted container can be slow on the first request, so the
     expect timeout is generous rather than flaky-tight. */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /* Tests create and delete real records in a shared database, so they run
     serially. Parallel workers would race each other for the same feed and
     produce failures that have nothing to do with the code. */
  fullyParallel: false,
  workers: 1,

  /* No silent retries locally: a test that only passes on the second attempt
     is hiding something. One retry in CI absorbs genuine network flakiness. */
  retries: process.env.CI ? 1 : 0,

  /* The HTML report is what goes on screen in the assessment video. */
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: WEB_BASE_URL,
    /* Traces and screenshots only for failures - enough to diagnose one
       without generating hundreds of megabytes for a green run. */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
