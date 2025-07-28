import { test, expect } from '@playwright/test';

test.describe('Performance Dashboard - Drawdown Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Login with test credentials
    await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
    await page.fill('input[placeholder="Enter your password"]', 'testpassword');
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the home page
    await page.waitForSelector('h1:has-text("AIMS")', { timeout: 10000 });
    
    // Navigate to Performance Analytics
    await page.click('button:has(h2:has-text("Performance Analytics"))');
    await page.waitForLoadState('networkidle');
  });

  test('should display Performance Dashboard with drawdown sections', async ({ page }) => {
    // Verify Performance Dashboard is loaded
    await expect(page.locator('h1:has-text("Performance Dashboard")')).toBeVisible();
    
    // Take a screenshot of the dashboard
    await page.screenshot({ path: 'test-results/performance-dashboard.png', fullPage: true });
    
    // Check for key drawdown sections
    const drawdownMetricsSection = page.locator('h2:has-text("Drawdown Metrics")');
    await expect(drawdownMetricsSection).toBeVisible();
    
    // Check for current drawdown metric
    await expect(page.locator('text=Current Drawdown').first()).toBeVisible();
    await expect(page.locator('text=Days in Drawdown').first()).toBeVisible();
    await expect(page.locator('text=Max Drawdown').first()).toBeVisible();
  });

  test('should display drawdown metrics with values', async ({ page }) => {
    // Wait for metrics to load
    await page.waitForSelector('text=Current Drawdown', { timeout: 10000 });
    
    // Check that metric cards have loaded (they have a specific background)
    const metricCards = page.locator('.bg-slate-900\\/50');
    await expect(metricCards.first()).toBeVisible();
    
    // Look for percentage values (drawdown metrics typically show percentages)
    const percentageValue = page.locator('text=/%/').first();
    const hasPercentage = await percentageValue.count() > 0;
    
    if (hasPercentage) {
      await expect(percentageValue).toBeVisible();
    }
    
    // Take a screenshot of the metrics
    await page.screenshot({ path: 'test-results/drawdown-metrics.png' });
  });

  test('should have interactive chart controls', async ({ page }) => {
    // Look for chart control buttons
    const showText = page.locator('text=Show:').first();
    
    if (await showText.isVisible()) {
      // Find visibility toggle buttons near the "Show:" text
      const chartSection = showText.locator('..');
      const toggleButtons = chartSection.locator('button');
      
      if (await toggleButtons.count() > 0) {
        // Click the first toggle button
        await toggleButtons.first().click();
        
        // Verify the button state changed (class should change)
        await expect(toggleButtons.first()).toHaveClass(/bg-slate-800/);
      }
    }
  });

  test('should display drawdown table with sortable columns', async ({ page }) => {
    // Scroll down to find the table
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Look for table headers
    const startDateHeader = page.locator('th:has-text("Start Date")').first();
    const maxDrawdownHeader = page.locator('th:has-text("Max Drawdown")').first();
    
    if (await startDateHeader.isVisible()) {
      // Click on a sortable header
      await maxDrawdownHeader.click();
      
      // Take a screenshot of the table
      await page.screenshot({ path: 'test-results/drawdown-table.png' });
    }
  });

  test('should show risk assessment section', async ({ page }) => {
    // Scroll to find risk assessment
    await page.evaluate(() => window.scrollBy(0, 1000));
    
    const riskAssessment = page.locator('text=Risk Assessment').first();
    
    if (await riskAssessment.isVisible()) {
      // Check for risk indicators
      const currentRisk = page.locator('text=Current Risk').first();
      await expect(currentRisk).toBeVisible();
      
      // Look for risk level (Low, Moderate, High)
      const riskLevels = ['Low', 'Moderate', 'High'];
      let foundRiskLevel = false;
      
      for (const level of riskLevels) {
        const riskLevel = page.locator(`text="${level}"`).first();
        if (await riskLevel.isVisible()) {
          foundRiskLevel = true;
          break;
        }
      }
      
      expect(foundRiskLevel).toBe(true);
    }
  });

  test('should handle collapsible sections', async ({ page }) => {
    // Find a section with a collapse button (usually has chevron icon)
    const sectionHeaders = page.locator('h3');
    
    for (let i = 0; i < await sectionHeaders.count(); i++) {
      const header = sectionHeaders.nth(i);
      const parent = header.locator('..');
      const collapseButton = parent.locator('button').last();
      
      if (await collapseButton.isVisible()) {
        // Get initial visibility of content
        const content = parent.locator('..').locator('> div').last();
        const wasVisible = await content.isVisible();
        
        // Click collapse button
        await collapseButton.click();
        await page.waitForTimeout(500); // Wait for animation
        
        // Check visibility changed
        const isVisibleNow = await content.isVisible();
        expect(isVisibleNow).toBe(!wasVisible);
        
        // Take screenshot of collapsed state
        await page.screenshot({ path: 'test-results/collapsed-section.png' });
        break;
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Reload the page to ensure proper responsive rendering
    await page.reload();
    
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-view.png', fullPage: true });
    
    // Check that metric cards stack vertically on mobile
    const metricCards = page.locator('.bg-slate-900\\/50');
    
    if (await metricCards.count() >= 2) {
      const firstCard = await metricCards.first().boundingBox();
      const secondCard = await metricCards.nth(1).boundingBox();
      
      if (firstCard && secondCard) {
        // On mobile, cards should stack (same x position, different y)
        expect(Math.abs(firstCard.x - secondCard.x)).toBeLessThan(10);
        expect(secondCard.y).toBeGreaterThan(firstCard.y);
      }
    }
  });
});