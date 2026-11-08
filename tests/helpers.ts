import { expect, type Page } from '@playwright/test';

export const DEMO_USER = { username: 'demo', password: 'password123' };

// Note: './' not '/'. On GitHub Pages the app lives under /<repo-name>/,
// and './' keeps that part of the baseURL while '/' would drop it.
export async function openApp(page: Page) {
  await page.goto('./');
}

export async function login(page: Page) {
  await openApp(page);
  await page.getByTestId('username').fill(DEMO_USER.username);
  await page.getByTestId('password').fill(DEMO_USER.password);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('board-view')).toBeVisible();
}

export async function addTask(page: Page, title: string) {
  await page.getByTestId('task-input').fill(title);
  await page.getByTestId('add-task-button').click();
}
