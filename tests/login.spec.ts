import { test, expect } from '@playwright/test';

// SauceDemo lists these public test accounts on its login page.
const PASSWORD = 'secret_sauce';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('standard user can log in', async ({ page }) => {
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByTestId('title')).toHaveText('Products');
  });

  test('locked out user sees an error', async ({ page }) => {
    await page.getByTestId('username').fill('locked_out_user');
    await page.getByTestId('password').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('error')).toContainText('Sorry, this user has been locked out.');
    await expect(page).not.toHaveURL(/inventory\.html/);
  });

  test('wrong password shows an error', async ({ page }) => {
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill('wrong_password');
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('error')).toContainText(
      'Username and password do not match any user in this service',
    );
  });

  test('empty form asks for a username', async ({ page }) => {
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('error')).toContainText('Username is required');
  });
});
