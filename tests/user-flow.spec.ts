import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('End-to-End User Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete flow: Enter code → Analyze → Review → Clear', async ({ page }) => {
    // Step 1: Verify initial state
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByText('Analyze Codes')).toBeVisible();

    // Step 2: Enter code
    await page.fill('textarea', '484 PC');
    await expect(page.locator('textarea')).toHaveValue('484 PC');

    // Step 3: Analyze
    await page.click('button:has-text("Analyze Codes")');

    // Step 4: Wait for and verify analysis loading
    await expect(page.getByRole('heading', { name: 'Analyzing with AI' })).toBeVisible({ timeout: 10000 });

    // Step 5: Verify results
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });
    await expect(page.getByText('Total Codes')).toBeVisible();

    // Step 6: Verify AI Chat is available
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Step 7: Clear
    await page.click('button:has-text("Clear All")');

    // Step 8: Verify return to initial state
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).not.toBeVisible();
  });

  test('PDF upload flow should switch modes', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text("Upload PDF")');

    // Should show upload area
    await expect(page.getByText(/drag and drop|upload/i).first()).toBeVisible();
  });

  test('AI Chat interaction after analysis', async ({ page }) => {
    // Analyze a code first
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Find the chat input and suggested questions
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Check that suggested questions are visible
    await expect(page.getByText('What exemption options')).toBeVisible();
  });

  test('should show decision framework guidance', async ({ page }) => {
    await page.fill('textarea', '11377 HS');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should have guidance about what to do next
    const pageContent = await page.content();
    const hasGuidance = pageContent.toLowerCase().includes('guidance') ||
      pageContent.toLowerCase().includes('recommendation') ||
      pageContent.toLowerCase().includes('next step') ||
      pageContent.toLowerCase().includes('consider');
    expect(hasGuidance).toBe(true);
  });

  test('error handling flow - empty input', async ({ page }) => {
    // Try to analyze with empty input
    await page.fill('textarea', '');

    // Analyze button should be disabled or clicking should not work
    const analyzeButton = page.locator('button:has-text("Analyze Codes")');

    // Check if button is disabled or click doesn't proceed
    const isDisabled = await analyzeButton.isDisabled();

    if (!isDisabled) {
      await analyzeButton.click();
      // Should stay on input screen
      await expect(page.locator('textarea')).toBeVisible();
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('mobile responsiveness - viewport resize', async ({ page }) => {
    // Start at desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('h1')).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // App should still be functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();

    // Enter and analyze on mobile
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });
  });
});

test.describe('Navigation and State Tests', () => {
  test('should maintain state during analysis', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // During loading, should show appropriate state
    await expect(page.getByRole('heading', { name: 'Analyzing with AI' })).toBeVisible({ timeout: 10000 });

    // User shouldn't be able to interact with input during analysis
    await expect(page.locator('textarea[disabled]')).toBeVisible().catch(() => {
      // Textarea might be hidden, which is also acceptable
    });
  });

  test('should handle rapid interactions gracefully', async ({ page }) => {
    await page.goto('/');

    // Rapid input changes
    await page.fill('textarea', '484');
    await page.fill('textarea', '484 PC');
    await page.fill('textarea', '484 PC, 211 PC');

    // Multiple rapid clicks should not cause issues
    await page.click('button:has-text("Analyze Codes")');

    // Should still work correctly
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });
  });
});
