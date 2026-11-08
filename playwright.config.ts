import { defineConfig, devices } from '@playwright/test';

// `CI` is set to "true" automatically on GitHub Actions runners.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Fail the CI build if someone accidentally commits `test.only`.
  forbidOnly: isCI,
  // Retry flaky tests on CI only.
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  // On CI: a list in the log + an HTML report we upload as an artifact.
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],

  use: {
    // SauceDemo: a free practice e-commerce site made for test automation.
    baseURL: 'https://www.saucedemo.com',
    // SauceDemo marks elements with data-test="..." so page.getByTestId() uses that.
    testIdAttribute: 'data-test',
    // Record a trace when a test is retried, so you can debug CI failures.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
