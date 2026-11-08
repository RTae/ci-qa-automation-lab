import { test, expect } from '@playwright/test';
import { DEMO_USER, login, openApp } from './helpers';

test.describe('App login', () => {
  test('demo user can log in and sees the task board', async ({ page }) => {
    await login(page);

    await expect(page.getByTestId('welcome')).toHaveText('Hello, demo!');
    await expect(page.getByTestId('login-view')).toBeHidden();
  });

  test('wrong password shows an error', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('username').fill(DEMO_USER.username);
    await page.getByTestId('password').fill('not-the-password');
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('login-error')).toHaveText('Invalid username or password');
    await expect(page.getByTestId('board-view')).toBeHidden();
  });

  test('empty form shows an error', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('login-error')).toHaveText('Username and password are required');
  });

  test('log out returns to the login form', async ({ page }) => {
    await login(page);
    await page.getByTestId('logout-button').click();

    await expect(page.getByTestId('login-view')).toBeVisible();
    await expect(page.getByTestId('board-view')).toBeHidden();
  });
});
