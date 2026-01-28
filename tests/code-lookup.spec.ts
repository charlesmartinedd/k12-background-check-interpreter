import { test, expect } from '@playwright/test';

test.describe('K-12 Background Check Interpreter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title and privacy notice', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('K-12 Background Check Interpreter');
    await expect(page.locator('text=Privacy Protected')).toBeVisible();
  });

  test('should analyze petty theft (484 PC) as non-disqualifying', async ({ page }) => {
    // Enter the code
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // Wait for results
    await expect(page.locator('text=Analysis Results')).toBeVisible();

    // Check that it's marked as non-disqualifying
    await expect(page.locator('text=Not Disqualifying')).toBeVisible();
    await expect(page.locator('text=Theft/Larceny')).toBeVisible();
  });

  test('should analyze DUI (23152 VC) as non-disqualifying', async ({ page }) => {
    await page.fill('textarea', '23152 VC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=Not Disqualifying')).toBeVisible();
  });

  test('should analyze drug possession (11377 HS) as non-disqualifying', async ({ page }) => {
    await page.fill('textarea', '11377 HS');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=Not Disqualifying')).toBeVisible();
  });

  test('should analyze robbery (211 PC) as mandatory disqualifier', async ({ page }) => {
    await page.fill('textarea', '211 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=Mandatory Disqualifier')).toBeVisible();
    await expect(page.locator('text=Violent Felony')).toBeVisible();
  });

  test('should analyze rape (261 PC) as mandatory disqualifier', async ({ page }) => {
    await page.fill('textarea', '261 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=Mandatory Disqualifier')).toBeVisible();
  });

  test('should analyze murder (187 PC) as mandatory disqualifier', async ({ page }) => {
    await page.fill('textarea', '187 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=Mandatory Disqualifier')).toBeVisible();
    await expect(page.locator('text=Murder')).toBeVisible();
  });

  test('should analyze multiple codes from sample RAP sheet', async ({ page }) => {
    // These are the actual codes from the Cornell/SJSU sample RAP sheet
    await page.fill('textarea', '32 PC, 484 PC, 459 PC, 23152 VC, 11377 HS');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();
    await expect(page.locator('text=5 offense')).toBeVisible();
  });

  test('should clear results when Clear All is clicked', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Analysis Results')).toBeVisible();

    // Click clear
    await page.click('button:has-text("Clear All")');

    // Should return to input screen
    await expect(page.locator('text=Enter Offense Codes')).toBeVisible();
  });

  test('should show decision framework for non-disqualifying offenses', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Decision Framework')).toBeVisible();
    await expect(page.locator('text=How much time has elapsed')).toBeVisible();
  });

  test('should show rehabilitation resources for disqualifying offenses', async ({ page }) => {
    await page.fill('textarea', '211 PC');
    await page.click('button:has-text("Analyze Codes")');

    await expect(page.locator('text=Exemption & Rehabilitation Resources')).toBeVisible();
    await expect(page.locator('text=Certificate of Rehabilitation')).toBeVisible();
  });
});

test.describe('PDF Upload Mode', () => {
  test('should switch to PDF upload mode', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Upload PDF")');

    await expect(page.locator('text=Upload RAP Sheet PDF')).toBeVisible();
    await expect(page.locator('text=Drag and drop')).toBeVisible();
  });
});
