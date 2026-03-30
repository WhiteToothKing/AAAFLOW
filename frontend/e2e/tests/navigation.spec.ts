import { test, expect } from '@playwright/test';

test.describe('Navigation (unauthenticated)', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login**');
    await expect(page.getByText('欢迎回来')).toBeVisible();
  });

  test('should redirect task list to login', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForURL('**/login**');
  });

  test('should redirect chat to login', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForURL('**/login**');
  });
});

test.describe('Error pages', () => {
  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/login');
    // Set a fake token to bypass auth
    await page.evaluate(() => localStorage.setItem('access_token', 'fake-token'));
    await page.goto('/nonexistent-page');
    await expect(page.getByText('页面不存在')).toBeVisible({ timeout: 10000 });
  });

  test('should show 403 error page', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('access_token', 'fake-token'));
    await page.goto('/error/403');
    await expect(page.getByText('权限不足')).toBeVisible({ timeout: 10000 });
  });

  test('should show 500 error page', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('access_token', 'fake-token'));
    await page.goto('/error/500');
    await expect(page.getByText('服务器错误')).toBeVisible({ timeout: 10000 });
  });
});
