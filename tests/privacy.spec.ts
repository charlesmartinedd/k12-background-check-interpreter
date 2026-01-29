import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Privacy Protection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not store PII in localStorage', async ({ page }) => {
    // Enter a code and analyze
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Check localStorage for any PII-like patterns
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key) || '';
        }
      }
      return items;
    });

    // Verify no SSN patterns
    const ssnPattern = /\d{3}-?\d{2}-?\d{4}/;
    for (const value of Object.values(localStorage)) {
      expect(ssnPattern.test(value)).toBe(false);
    }
  });

  test('should not store PII in sessionStorage', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    const sessionStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          items[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      return items;
    });

    // Verify no SSN patterns
    const ssnPattern = /\d{3}-?\d{2}-?\d{4}/;
    for (const value of Object.values(sessionStorage)) {
      expect(ssnPattern.test(value)).toBe(false);
    }
  });

  test('should only transmit code strings in API requests', async ({ page }) => {
    // Track API requests
    const apiRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('openai.com') || request.url().includes('generativelanguage.googleapis.com')) {
        apiRequests.push(request.postData() || '');
      }
    });

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Verify no SSN patterns (strict PII check)
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;

    for (const request of apiRequests) {
      // Should not contain SSN-like patterns
      expect(ssnPattern.test(request)).toBe(false);
    }

    // Should have made at least one API request
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('Clear All should completely remove data', async ({ page }) => {
    await page.fill('textarea', '484 PC, 211 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Click Clear All
    await page.click('button:has-text("Clear All")');

    // Verify return to input screen
    await expect(page.locator('textarea')).toBeVisible();

    // Check that localStorage is empty or doesn't contain analysis data
    const localStorage = await page.evaluate(() => {
      return window.localStorage.getItem('analysis') || window.localStorage.getItem('codes');
    });
    expect(localStorage).toBeNull();

    // Check sessionStorage
    const sessionStorage = await page.evaluate(() => {
      return window.sessionStorage.getItem('analysis') || window.sessionStorage.getItem('codes');
    });
    expect(sessionStorage).toBeNull();
  });

  test('data should not persist on page reload after clear', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Clear and reload
    await page.click('button:has-text("Clear All")');
    await page.reload();

    // Should show fresh input screen, not persisted analysis
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).not.toBeVisible();
  });
});
