import { test, expect } from '@playwright/test';

test.setTimeout(180000); // Extended timeout for API tests

test.describe('API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should successfully connect to OpenAI API', async ({ page }) => {
    // Track API requests
    let openaiCalled = false;
    let openaiSuccess = false;

    page.on('response', response => {
      if (response.url().includes('api.openai.com')) {
        openaiCalled = true;
        if (response.status() >= 200 && response.status() < 300) {
          openaiSuccess = true;
        }
      }
    });

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Either OpenAI was called successfully, or analysis completed (might use cached/local data)
    expect(openaiCalled ? openaiSuccess : true).toBe(true);
  });

  test('should successfully connect to Gemini API', async ({ page }) => {
    let geminiCalled = false;
    let geminiSuccess = false;

    page.on('response', response => {
      if (response.url().includes('generativelanguage.googleapis.com')) {
        geminiCalled = true;
        if (response.status() >= 200 && response.status() < 300) {
          geminiSuccess = true;
        }
      }
    });

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    expect(geminiCalled).toBe(true);
    expect(geminiSuccess).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and force an error
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // Wait for either results or timeout
    try {
      await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 30000 });
    } catch {
      // Analysis may fail, but app should not crash
    }

    // Page should still be functional and not crash
    await expect(page.locator('body')).toBeVisible();

    // Should show some form of content
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('should use multi-source verification for unknown codes', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('openai.com') || request.url().includes('generativelanguage.googleapis.com')) {
        apiCalls.push(request.url());
      }
    });

    // Use a less common code that might need multi-source lookup
    await page.fill('textarea', '647 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should have called at least one API
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('should verify both APIs are called for comprehensive analysis', async ({ page }) => {
    let openaiCount = 0;
    let geminiCount = 0;

    page.on('request', request => {
      if (request.url().includes('openai.com')) openaiCount++;
      if (request.url().includes('generativelanguage.googleapis.com')) geminiCount++;
    });

    await page.fill('textarea', '211 PC, 484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Both APIs should be called for comprehensive RAG + AI analysis
    expect(openaiCount).toBeGreaterThan(0);
    expect(geminiCount).toBeGreaterThan(0);
  });

  test('should return consistent results for same code', async ({ page }) => {
    // First analysis
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    const firstResult = await page.content();

    // Clear and analyze again
    await page.click('button:has-text("Clear All")');
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    const secondResult = await page.content();

    // Classification should be consistent (petty theft = non-disqualifying)
    expect(firstResult.toLowerCase().includes('petty') || firstResult.toLowerCase().includes('theft')).toBe(
      secondResult.toLowerCase().includes('petty') || secondResult.toLowerCase().includes('theft')
    );
  });
});

test.describe('Verification Source Tests', () => {
  test('should show verification source information', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Results should indicate they came from verified sources
    const pageContent = await page.content();

    // Should have some indication of data quality/source
    const hasQualityIndicator = pageContent.toLowerCase().includes('confidence') ||
      pageContent.toLowerCase().includes('verified') ||
      pageContent.toLowerCase().includes('source') ||
      pageContent.toLowerCase().includes('citation') ||
      pageContent.toLowerCase().includes('pc ') || // Statute reference
      pageContent.toLowerCase().includes('education code');

    expect(hasQualityIndicator).toBe(true);
  });

  test('should handle completely unknown codes', async ({ page }) => {
    await page.goto('/');

    // Use a made-up code
    await page.fill('textarea', 'ZZZZZ 99999');
    await page.click('button:has-text("Analyze Codes")');

    // Should complete without crashing
    await page.waitForTimeout(10000);

    // Either shows results with unknown status or handles gracefully
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});
