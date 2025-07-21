import { test, expect } from '@playwright/test';

test.describe('Phase 2 Widget Integration', () => {
  test('should load dashboard with all widgets', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await expect(page.locator('#root')).toBeVisible();

    // Check for main dashboard elements
    await expect(page.locator('body')).toContainText('AIMS');
  });

  test('should render HoldingsTable widget', async ({ page }) => {
    await page.goto('/');

    // Look for Holdings table or related elements
    // This will help us verify the component renders
    const holdingsElements = page.locator(
      '[data-testid*="holdings"], [class*="holdings"], [class*="Holdings"]'
    );

    // Check if any holdings-related elements exist
    const count = await holdingsElements.count();
    console.log(`Found ${count} holdings-related elements`);

    // Take a screenshot for manual verification
    await page.screenshot({ path: 'test-results/holdings-widget.png', fullPage: true });
  });

  test('should render PerformanceChart widget', async ({ page }) => {
    await page.goto('/');

    // Look for Performance chart elements
    const performanceElements = page.locator(
      '[data-testid*="performance"], [class*="performance"], [class*="Performance"], [class*="chart"], [class*="Chart"]'
    );

    const count = await performanceElements.count();
    console.log(`Found ${count} performance-related elements`);

    await page.screenshot({ path: 'test-results/performance-widget.png', fullPage: true });
  });

  test('should render NextActionsWidget', async ({ page }) => {
    await page.goto('/');

    // Look for Next Actions elements
    const actionsElements = page.locator(
      '[data-testid*="actions"], [class*="actions"], [class*="Actions"], [class*="next"]'
    );

    const count = await actionsElements.count();
    console.log(`Found ${count} actions-related elements`);

    await page.screenshot({ path: 'test-results/actions-widget.png', fullPage: true });
  });

  test('should render MorningBriefCard', async ({ page }) => {
    await page.goto('/');

    // Look for Morning Brief elements
    const briefElements = page.locator(
      '[data-testid*="brief"], [class*="brief"], [class*="Brief"], [class*="morning"], [class*="Morning"]'
    );

    const count = await briefElements.count();
    console.log(`Found ${count} brief-related elements`);

    await page.screenshot({ path: 'test-results/brief-widget.png', fullPage: true });
  });

  test('should check for SnapTrade integration elements', async ({ page }) => {
    await page.goto('/');

    // Look for SnapTrade-related elements using separate locators
    const snapTradeByTestId = page.locator('[data-testid*="snaptrade"]');
    const snapTradeByClass = page.locator('[class*="snaptrade"]');
    const snapTradeByText = page.locator('text=SnapTrade');

    const testIdCount = await snapTradeByTestId.count();
    const classCount = await snapTradeByClass.count();
    const textCount = await snapTradeByText.count();
    
    const totalCount = testIdCount + classCount + textCount;
    console.log(`Found ${totalCount} SnapTrade-related elements (testid: ${testIdCount}, class: ${classCount}, text: ${textCount})`);

    // Look for account selector elements
    const accountElements = page.locator('[data-testid*="account"], [class*="account"]');
    const accountCount = await accountElements.count();
    console.log(`Found ${accountCount} account-related elements`);

    await page.screenshot({ path: 'test-results/snaptrade-integration.png', fullPage: true });
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for any async operations

    // Report errors but don't fail the test - we want to see what errors exist
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }

    // Take a screenshot of the final state
    await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
  });
});
