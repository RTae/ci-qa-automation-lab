import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// Which version the app should show in its footer:
// - EXPECTED_VERSION set (the SIT pipeline sets it to the git tag) -> exactly that
// - testing SIT without EXPECTED_VERSION (a manual re-run) -> any sit_* version
// - testing localhost -> "local-dev", which scripts/build.mjs stamps by default
const expectedVersion: string | RegExp =
  process.env.EXPECTED_VERSION || (process.env.SIT_URL ? /^sit_/ : 'local-dev');

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
