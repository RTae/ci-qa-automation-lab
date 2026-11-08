import { defineConfig, devices } from '@playwright/test';

// `CI` is set to "true" automatically on GitHub Actions runners.
const isCI = !!process.env.CI;

// Where the app under test lives:
// - SIT_URL set (the SIT pipeline passes the GitHub Pages URL) -> test the deployed app
// - not set -> build the app and serve it on localhost (see `webServer` below)
const LOCAL_URL = 'http://localhost:4173/';
const sitUrl = process.env.SIT_URL;
// The trailing slash matters: page.goto('./') resolves against it, which keeps
// the /repo-name/ part of a GitHub Pages URL.
const baseURL = sitUrl ? sitUrl.replace(/\/?$/, '/') : LOCAL_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Fail the CI build if someone accidentally commits `test.only`.
  forbidOnly: isCI,
  // Retry flaky tests on CI only.
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  // On CI:
  // - list: one line per test in the job log
  // - github: shows each failure on the run page, with its file and line
  // - github-summary: our own reporter, writes a results table to the run's Summary page
  // - html: the full report (screenshots, traces), uploaded as an artifact
  reporter: isCI
    ? [
        ['list'],
        ['github'],
        ['./reporters/github-summary.ts'],
        ['html', { open: 'never' }],
      ]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
    // The app marks elements with data-test="...", so page.getByTestId() uses that.
    testIdAttribute: 'data-test',
    // Record a trace when a test is retried, so you can debug CI failures.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Start the app before the tests, unless we're testing an already-deployed SIT.
  webServer: sitUrl
    ? undefined
    : {
        command: 'npm run build && npm run serve',
        url: LOCAL_URL,
        reuseExistingServer: !isCI,
        timeout: 30_000,
      },
});
