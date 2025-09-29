import { test, expect } from '@playwright/test';

test('landing page has hero copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /audio/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /open editor/i })).toBeVisible();
});
