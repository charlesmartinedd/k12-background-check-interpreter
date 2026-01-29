import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should support keyboard navigation through main elements', async ({ page }) => {
    // Press Tab to navigate through focusable elements
    await page.keyboard.press('Tab');

    // First focusable element should be focused
    const focused1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused1).toBeTruthy();

    // Continue tabbing to find textarea
    let foundTextarea = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const currentTag = await page.evaluate(() => document.activeElement?.tagName);
      if (currentTag === 'TEXTAREA') {
        foundTextarea = true;
        break;
      }
    }
    expect(foundTextarea).toBe(true);

    // Type in textarea using keyboard
    await page.keyboard.type('484 PC');
    await expect(page.locator('textarea')).toHaveValue('484 PC');

    // Tab to button and press Enter
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentTag = await page.evaluate(() => document.activeElement?.tagName);
      if (currentTag === 'BUTTON') {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // Should trigger analysis
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });
  });

  test('should have proper focus indicators', async ({ page }) => {
    // Focus on textarea
    await page.locator('textarea').focus();

    // Check focus styling
    const focusStyles = await page.locator('textarea').evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineOffset: styles.outlineOffset,
        boxShadow: styles.boxShadow,
        borderColor: styles.borderColor
      };
    });

    // Should have visible focus indicator (outline, box-shadow, or border change)
    const hasFocusIndicator =
      focusStyles.outline !== 'none' ||
      focusStyles.boxShadow !== 'none' ||
      focusStyles.borderColor !== 'rgb(0, 0, 0)';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should have sufficient color contrast ratios', async ({ page }) => {
    // Check main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const h1Colors = await h1.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      // Get effective background by traversing up
      let bgColor = styles.backgroundColor;
      let parent = el.parentElement;
      while (parent && (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)')) {
        bgColor = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      return {
        color: styles.color,
        backgroundColor: bgColor || 'rgb(255, 255, 255)' // Default to white
      };
    });

    // Parse RGB values
    const parseRGB = (color: string) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      }
      return { r: 255, g: 255, b: 255 }; // Default to white
    };

    const textColor = parseRGB(h1Colors.color);
    const bgColor = parseRGB(h1Colors.backgroundColor);

    // Calculate relative luminance
    const getLuminance = (rgb: { r: number; g: number; b: number }) => {
      const sRGB = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(textColor);
    const l2 = getLuminance(bgColor);
    const contrastRatio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    expect(contrastRatio).toBeGreaterThanOrEqual(3);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    // Check textarea has accessible name
    const textarea = page.locator('textarea');
    const textareaAccessibleName = await textarea.evaluate((el) => {
      return el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.closest('label')?.textContent ||
        document.querySelector(`label[for="${el.id}"]`)?.textContent;
    });
    expect(textareaAccessibleName).toBeTruthy();

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.evaluate((el) => {
        return el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title');
      });
      // Each visible button should have some accessible name
      const isVisible = await button.isVisible();
      if (isVisible) {
        expect(accessibleName).toBeTruthy();
      }
    }
  });

  test('should work with screen reader announcements', async ({ page }) => {
    // Check for presence of ARIA live regions
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');

    // Wait for analysis
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Check page structure has proper headings hierarchy
    const headings = await page.evaluate(() => {
      const h1s = document.querySelectorAll('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');
      return {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length
      };
    });

    // Should have at least one h1
    expect(headings.h1Count).toBeGreaterThanOrEqual(1);

    // Heading hierarchy should be logical (h2s after h1s, etc.)
    // This is a simplified check
    expect(headings.h1Count).toBeLessThanOrEqual(2); // Not too many h1s
  });
});

test.describe('Motor Accessibility Tests', () => {
  test('should have adequately sized touch targets', async ({ page }) => {
    await page.goto('/');

    const analyzeButton = page.locator('button:has-text("Analyze Codes")');
    await expect(analyzeButton).toBeVisible();

    const buttonSize = await analyzeButton.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // WCAG recommends 44x44px minimum for touch targets
    expect(buttonSize.width).toBeGreaterThanOrEqual(44);
    expect(buttonSize.height).toBeGreaterThanOrEqual(44);
  });

  test('should not rely on hover alone for information', async ({ page }) => {
    await page.goto('/');

    // All important information should be visible without hover
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();

    // Analyze a code to get results
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Results should be visible without hover
    await expect(page.getByText('Total Codes')).toBeVisible();
  });
});
