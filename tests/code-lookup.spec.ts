import { test, expect } from '@playwright/test';

// Increase timeout for AI-powered analysis (API calls take time)
test.setTimeout(120000);

test.describe('K-12 Background Check Interpreter V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title and AI-enhanced badge', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('K-12 Background Check Interpreter');
    await expect(page.getByText('AI-Enhanced', { exact: true })).toBeVisible();
    await expect(page.getByText('GPT-5.2').first()).toBeVisible();
  });

  test('should analyze petty theft (484 PC) with AI', async ({ page }) => {
    // Enter the code
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // Wait for AI analysis loading state
    await expect(page.getByRole('heading', { name: 'Analyzing with AI' })).toBeVisible({ timeout: 10000 });

    // Wait for results - use first() to handle multiple matches
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Verify analysis completed
    await expect(page.getByText('Total Codes')).toBeVisible();
    await expect(page.getByText('Analyzed').first()).toBeVisible();
  });

  test('should analyze robbery (211 PC) as disqualifier with AI', async ({ page }) => {
    await page.fill('textarea', '211 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Robbery should be flagged - check for disqualifier indicator
    await expect(page.getByText(/Disqualif/i).first()).toBeVisible();
  });

  test('should analyze multiple codes with AI', async ({ page }) => {
    await page.fill('textarea', '484 PC, 211 PC, 23152 VC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should show 3 total codes
    await expect(page.getByText('3').first()).toBeVisible();
  });

  test('should clear results when Clear All is clicked', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Click clear
    await page.click('button:has-text("Clear All")');

    // Should return to input screen
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should show AI Chat after analysis', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // AI Chat should be visible
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByText('GPT-5.2 Powered')).toBeVisible();
  });
});

test.describe('PDF Upload Mode', () => {
  test('should switch to PDF upload mode', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Upload PDF")');

    await expect(page.getByText(/drag and drop|upload/i).first()).toBeVisible();
  });
});

test.describe('UI Components', () => {
  test('should show privacy notice', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/privacy/i).first()).toBeVisible();
  });

  test('should show AI disclaimer in footer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/does not constitute legal advice/i)).toBeVisible();
  });
});
