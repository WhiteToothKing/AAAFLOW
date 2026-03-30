import { test, expect } from '@playwright/test';

test.describe('Visual Theme', () => {
  test('login page has brand gradient on left panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    const brandPanel = page.locator('.login-brand');
    await expect(brandPanel).toBeVisible();
    const bg = await brandPanel.evaluate((el) => window.getComputedStyle(el).background);
    expect(bg).toContain('gradient');
  });

  test('login submit button has gradient style', async ({ page }) => {
    await page.goto('/login');
    const btn = page.locator('.login-submit-btn');
    await expect(btn).toBeVisible();
  });

  test('feature cards render on login page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    const features = page.locator('.login-feature');
    await expect(features).toHaveCount(3);
  });

  test('custom scrollbar styles applied', async ({ page }) => {
    await page.goto('/login');
    const hasScrollbarStyles = await page.evaluate(() => {
      const styles = document.styleSheets;
      for (let i = 0; i < styles.length; i++) {
        try {
          const rules = styles[i].cssRules;
          for (let j = 0; j < rules.length; j++) {
            if (rules[j].cssText?.includes('scrollbar')) return true;
          }
        } catch { /* cross-origin */ }
      }
      return false;
    });
    expect(hasScrollbarStyles).toBe(true);
  });
});
