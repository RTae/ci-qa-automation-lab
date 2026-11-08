import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// The SIT pipeline sets EXPECTED_VERSION to the git tag (e.g. sit_1.0.0).
// Locally the build stamps "local-dev".
const expectedVersion = process.env.EXPECTED_VERSION ?? 'local-dev';

test.describe('Smoke', () => {
  test('app loads and shows the login form', async ({ page }) => {
    await openApp(page);

    await expect(page).toHaveTitle('Task Tracker');
    await expect(page.getByTestId('login-view')).toBeVisible();
  });

  test('the deployed version is the one we built', async ({ page }) => {
    await openApp(page);

    await expect(page.getByTestId('app-version')).toHaveText(expectedVersion);
  });
});
