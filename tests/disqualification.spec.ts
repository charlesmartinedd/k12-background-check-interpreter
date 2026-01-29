import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Disqualification Categorization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('PC 667.5(c) violent felonies should be mandatory disqualifiers', async ({ page }) => {
    // Robbery - violent felony under PC 667.5(c)
    await page.fill('textarea', '211 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should show as disqualifier
    await expect(page.getByText(/mandatory/i).first()).toBeVisible();
    await expect(page.getByText(/disqualif/i).first()).toBeVisible();
  });

  test('PC 1192.7(c) serious felonies should show exemption path available', async ({ page }) => {
    // Burglary - serious felony under PC 1192.7(c) but not violent
    await page.fill('textarea', '459 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should mention exemption possibilities
    const pageContent = await page.content();
    const hasExemptionMention = pageContent.toLowerCase().includes('exemption') ||
      pageContent.toLowerCase().includes('rehabilitation') ||
      pageContent.toLowerCase().includes('certificate');
    expect(hasExemptionMention).toBe(true);
  });

  test('drug offenses should require review', async ({ page }) => {
    // Possession - HS 11377 drug offense
    await page.fill('textarea', '11377 HS');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should show review required or individualized assessment
    const pageContent = await page.content();
    const hasReviewMention = pageContent.toLowerCase().includes('review') ||
      pageContent.toLowerCase().includes('assessment') ||
      pageContent.toLowerCase().includes('consider');
    expect(hasReviewMention).toBe(true);
  });

  test('petty theft should be non-disqualifying', async ({ page }) => {
    // Petty theft - 484 PC misdemeanor
    await page.fill('textarea', '484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should indicate non-disqualifying
    const pageContent = await page.content();
    const hasNonDisqualifyingMention = pageContent.toLowerCase().includes('non-disqualifying') ||
      pageContent.toLowerCase().includes('not a disqualifier') ||
      pageContent.toLowerCase().includes('may proceed') ||
      pageContent.toLowerCase().includes('not automatically');
    expect(hasNonDisqualifyingMention).toBe(true);
  });

  test('unknown codes should be handled properly', async ({ page }) => {
    // Fake code that doesn't exist
    await page.fill('textarea', '99999 XX');
    await page.click('button:has-text("Analyze Codes")');

    // Should either show analysis with unknown status or handle gracefully
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should have some result, not crash
    await expect(page.getByText('Total Codes')).toBeVisible();
  });

  test('DUI (23152 VC) should require individualized assessment', async ({ page }) => {
    await page.fill('textarea', '23152 VC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // DUI typically requires review based on circumstances
    const pageContent = await page.content();
    const hasAssessmentMention = pageContent.toLowerCase().includes('review') ||
      pageContent.toLowerCase().includes('assessment') ||
      pageContent.toLowerCase().includes('individualized');
    expect(hasAssessmentMention).toBe(true);
  });

  test('multiple codes should show correct category counts', async ({ page }) => {
    // Mix of codes: violent felony, drug offense, petty theft
    await page.fill('textarea', '211 PC, 11377 HS, 484 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should show 3 total codes
    await expect(page.getByText('3').first()).toBeVisible();

    // Should have at least one disqualifier count
    await expect(page.getByText(/disqualif/i).first()).toBeVisible();
  });

  test('sex offenses should be mandatory disqualifiers', async ({ page }) => {
    // PC 288 - lewd acts with minor
    await page.fill('textarea', '288 PC');
    await page.click('button:has-text("Analyze Codes")');
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible({ timeout: 90000 });

    // Should absolutely be a mandatory disqualifier
    await expect(page.getByText(/mandatory/i).first()).toBeVisible();
    await expect(page.getByText(/disqualif/i).first()).toBeVisible();
  });
});
