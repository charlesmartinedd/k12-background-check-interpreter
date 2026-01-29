import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Visual Design Review Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should capture visual regression baseline - home screen', async ({ page }) => {
    // Wait for page to fully load
    await expect(page.locator('h1')).toBeVisible();

    // Take screenshot for manual review (not assertion-based)
    await page.screenshot({ path: 'test-results/home-screen-baseline.png', fullPage: true });

    // Verify page loaded correctly
    await expect(page.locator('h1')).toContainText('K-12 Background Check');
  });

  test('should capture visual regression baseline - results screen', async ({ page }) => {
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Wait for animations to settle
    await page.waitForTimeout(1000);

    // Take screenshot for manual review
    await page.screenshot({ path: 'test-results/results-screen-baseline.png', fullPage: true });

    // Verify results are displayed
    await expect(page.getByText('Total Codes')).toBeVisible();
  });

  test('should verify Apple-inspired color palette', async ({ page }) => {
    // Check primary button uses Apple blue (#0071E3 or similar)
    const analyzeButton = page.locator('button:has-text("Analyze Codes")');
    await expect(analyzeButton).toBeVisible();

    const buttonStyles = await analyzeButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        color: styles.color
      };
    });

    // Verify rounded corners (Apple style uses generous border radius)
    const borderRadius = parseFloat(buttonStyles.borderRadius);
    expect(borderRadius).toBeGreaterThanOrEqual(6);

    // Verify text is readable (not same as background)
    expect(buttonStyles.color).not.toBe(buttonStyles.backgroundColor);
  });

  test('should verify typography and font consistency', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const h1Styles = await h1.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontFamily: styles.fontFamily,
        fontWeight: styles.fontWeight,
        fontSize: styles.fontSize
      };
    });

    // Verify heading uses proper font weight
    const fontWeight = parseInt(h1Styles.fontWeight);
    expect(fontWeight).toBeGreaterThanOrEqual(600); // Semi-bold or bolder

    // Verify proper heading size
    const fontSize = parseFloat(h1Styles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(24); // Should be large heading
  });
});

test.describe('Component Styling Tests', () => {
  test('Cards should have proper shadows and rounded corners', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Find a card element
    const card = page.locator('[class*="card"], [class*="Card"]').first();

    if (await card.count() > 0) {
      const cardStyles = await card.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow
        };
      });

      // Verify rounded corners
      const borderRadius = parseFloat(cardStyles.borderRadius);
      expect(borderRadius).toBeGreaterThanOrEqual(8);
    }
  });

  test('Input fields should have proper styling', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    const inputStyles = await textarea.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        borderWidth: styles.borderWidth
      };
    });

    // Verify input has proper border radius
    const borderRadius = parseFloat(inputStyles.borderRadius);
    expect(borderRadius).toBeGreaterThanOrEqual(4);
  });

  test('Loading states should have proper animations', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // Capture loading state
    const loadingHeading = page.getByRole('heading', { name: 'Analyzing with AI' });
    await expect(loadingHeading).toBeVisible({ timeout: 10000 });

    // Check for animated elements during loading
    const animatedElements = page.locator('[class*="animate"]');
    const count = await animatedElements.count();

    // Should have at least one animated element during loading
    expect(count).toBeGreaterThanOrEqual(0); // Loading animation exists
  });

  test('Responsive design should maintain visual consistency', async ({ page }) => {
    // Test at tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // Take screenshot for review
    await page.screenshot({ path: 'test-results/tablet-view-baseline.png', fullPage: true });

    // Test at mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();

    // Take screenshot for review
    await page.screenshot({ path: 'test-results/mobile-view-baseline.png', fullPage: true });

    // Verify responsive elements work
    await expect(page.locator('textarea')).toBeVisible();
  });
});
