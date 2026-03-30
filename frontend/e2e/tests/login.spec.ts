import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('欢迎回来')).toBeVisible();
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('should show brand panel on wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await expect(page.getByText('AAAFLOW')).toBeVisible();
    await expect(page.getByText('AI 赋能游戏美术全流程工作流')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('invalid_user');
    await page.getByPlaceholder('请输入密码').fill('wrong_password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('登录失败')).toBeVisible({ timeout: 15000 });
  });

  test('should have API settings collapse', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('API 服务器地址').click();
    await expect(page.getByPlaceholder('http://127.0.0.1:8000/api')).toBeVisible();
  });

  test('should show forgot password modal', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('忘记密码?').click();
    await expect(page.getByText('私有化部署')).toBeVisible();
  });
});
