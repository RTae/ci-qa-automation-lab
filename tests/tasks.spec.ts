import { test, expect } from '@playwright/test';
import { addTask, login } from './helpers';

test.describe('Tasks', () => {
  // Each test gets a fresh browser context, so storage (and the task list)
  // starts empty every time.
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('add a task', async ({ page }) => {
    await addTask(page, 'Write Playwright tests');

    await expect(page.getByTestId('task-title')).toHaveText(['Write Playwright tests']);
    await expect(page.getByTestId('task-count')).toHaveText('1 task left');
    // The input is cleared, ready for the next task.
    await expect(page.getByTestId('task-input')).toHaveValue('');
  });

  test('empty task shows an error and adds nothing', async ({ page }) => {
    await addTask(page, '   ');

    await expect(page.getByTestId('task-error')).toHaveText('Task title is required');
    await expect(page.getByTestId('task-item')).toHaveCount(0);
  });

  test('task title longer than 100 characters is rejected', async ({ page }) => {
    await addTask(page, 'x'.repeat(101));

    await expect(page.getByTestId('task-error')).toHaveText(
      'Task title must be 100 characters or less',
    );
    await expect(page.getByTestId('task-item')).toHaveCount(0);
  });

  test('complete a task and filter by status', async ({ page }) => {
    await addTask(page, 'Set up CI');
    await addTask(page, 'Deploy to SIT');
    await expect(page.getByTestId('task-count')).toHaveText('2 tasks left');

    // Find the row by its text, then tick its checkbox.
    const ciTask = page.getByTestId('task-item').filter({ hasText: 'Set up CI' });
    await ciTask.getByTestId('task-toggle').check();
    await expect(page.getByTestId('task-count')).toHaveText('1 task left');

    await page.getByTestId('filter-active').click();
    await expect(page.getByTestId('task-title')).toHaveText(['Deploy to SIT']);

    await page.getByTestId('filter-done').click();
    await expect(page.getByTestId('task-title')).toHaveText(['Set up CI']);

    await page.getByTestId('filter-all').click();
    await expect(page.getByTestId('task-title')).toHaveText(['Set up CI', 'Deploy to SIT']);
  });

  test('delete a task', async ({ page }) => {
    await addTask(page, 'Keep me');
    await addTask(page, 'Delete me');

    await page.getByRole('button', { name: 'Delete Delete me' }).click();

    await expect(page.getByTestId('task-title')).toHaveText(['Keep me']);
  });

  test('tasks survive a page reload', async ({ page }) => {
    await addTask(page, 'Still here after reload');
    await page.reload();

    await expect(page.getByTestId('task-title')).toHaveText(['Still here after reload']);
  });
});
