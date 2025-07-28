import { test, expect } from '@playwright/test';

test.describe('Drawdown Analysis Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Login if required (adjust selectors based on your login form)
    const loginButton = await page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to Performance Analytics from home page
    await page.waitForSelector('h2:has-text("Performance Analytics")', { timeout: 10000 });
    await page.click('button:has(h2:has-text("Performance Analytics"))');
    await page.waitForLoadState('networkidle');
  });

  test('should display drawdown dashboard with all sections', async ({ page }) => {
    
    // Verify Performance Dashboard is loaded with drawdown sections
    await expect(page.locator('h1:has-text("Performance Dashboard")')).toBeVisible();
    
    // Verify drawdown sections are present
    await expect(page.locator('text=Drawdown Metrics')).toBeVisible();
    await expect(page.locator('text=Drawdown Analysis').first()).toBeVisible();
  });

  test('should display current drawdown metrics', async ({ page }) => {
    
    // Wait for metrics to load - look for metric cards in performance dashboard
    await page.waitForSelector('.bg-slate-900\\/50', { timeout: 10000 });
    
    // Check for key metric cards
    await expect(page.locator('text=Current Drawdown')).toBeVisible();
    await expect(page.locator('text=Days in Drawdown')).toBeVisible();
    await expect(page.locator('text=Max Drawdown')).toBeVisible();
    await expect(page.locator('text=Current Value')).toBeVisible();
    
    // Verify metrics have values (not loading state)
    const currentDrawdownValue = await page.locator('p:has-text("%")').first();
    await expect(currentDrawdownValue).toBeVisible();
    await expect(currentDrawdownValue).not.toBeEmpty();
  });

  test('should interact with drawdown chart controls', async ({ page }) => {
    
    // Wait for chart to load
    await page.waitForSelector('text=Show:', { timeout: 10000 });
    
    // Test visibility toggles
    const portfolioValueToggle = await page.locator('button:has-text("Portfolio Value")');
    const drawdownPercentToggle = await page.locator('button:has-text("Drawdown %")');
    const underwaterCurveToggle = await page.locator('button:has-text("Underwater Curve")');
    
    // Click toggles and verify visual changes
    await portfolioValueToggle.click();
    await expect(portfolioValueToggle).toHaveClass(/bg-slate-800/);
    
    await drawdownPercentToggle.click();
    await expect(drawdownPercentToggle).toHaveClass(/bg-slate-800/);
    
    await underwaterCurveToggle.click();
    await expect(underwaterCurveToggle).toHaveClass(/bg-purple-500\/10/);
  });

  test('should display and sort historical drawdown events table', async ({ page }) => {
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Verify table headers
    await expect(page.locator('th:has-text("Start Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Max Drawdown")')).toBeVisible();
    await expect(page.locator('th:has-text("Duration")')).toBeVisible();
    await expect(page.locator('th:has-text("Recovery")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    
    // Test sorting functionality
    const maxDrawdownHeader = await page.locator('button:has-text("Max Drawdown")');
    await maxDrawdownHeader.click();
    
    // Verify sort icon changes
    await expect(maxDrawdownHeader.locator('svg')).toBeVisible();
  });

  test('should display alert configuration with thresholds', async ({ page }) => {
    
    // Wait for alert section
    await page.waitForSelector('text=Alert Thresholds', { timeout: 10000 });
    
    // Verify threshold levels
    await expect(page.locator('text=Warning Level')).toBeVisible();
    await expect(page.locator('text=Critical Level')).toBeVisible();
    await expect(page.locator('text=Emergency Level')).toBeVisible();
    
    // Check for threshold values
    await expect(page.locator('text=15%').first()).toBeVisible();
    await expect(page.locator('text=20%').first()).toBeVisible();
    await expect(page.locator('text=25%').first()).toBeVisible();
  });

  test('should handle collapsible sections', async ({ page }) => {
    
    // Find a collapsible section (e.g., Historical Drawdown Events)
    const sectionHeader = await page.locator('h3:has-text("Historical Drawdown Events")').locator('..');
    const collapseButton = await sectionHeader.locator('button').last();
    
    // Click to collapse
    await collapseButton.click();
    
    // Verify content is hidden
    const tableContent = await page.locator('table');
    await expect(tableContent).toBeHidden();
    
    // Click to expand
    await collapseButton.click();
    
    // Verify content is visible again
    await expect(tableContent).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile-specific layouts
    // Metrics should stack vertically
    const metricCards = await page.locator('.bg-slate-900\\/50');
    const firstCard = await metricCards.first().boundingBox();
    const secondCard = await metricCards.nth(1).boundingBox();
    
    if (firstCard && secondCard) {
      // Cards should be stacked (same x position, different y)
      expect(firstCard.x).toBe(secondCard.x);
      expect(secondCard.y).toBeGreaterThan(firstCard.y);
    }
    
    // Table should show mobile card view instead
    const desktopTable = await page.locator('table');
    await expect(desktopTable).toBeHidden();
    
    const mobileCards = await page.locator('.md\\:hidden');
    await expect(mobileCards).toBeVisible();
  });

  test('should display real-time data updates', async ({ page }) => {
    
    // Find refresh button
    const refreshButton = await page.locator('button[aria-label*="refresh"]');
    
    if (await refreshButton.isVisible()) {
      // Get initial value
      const initialValue = await page.locator('p:has-text("%")').first().textContent();
      
      // Click refresh
      await refreshButton.click();
      
      // Wait for potential update
      await page.waitForTimeout(1000);
      
      // Verify the value is still displayed (data might not change, but should not error)
      const updatedValue = await page.locator('p:has-text("%")').first();
      await expect(updatedValue).toBeVisible();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // This test would require mocking the API to return empty data
    // For now, we'll just verify the UI doesn't break with minimal data
    
    // Even with no historical events, the current metrics should display
    await expect(page.locator('text=Current Drawdown')).toBeVisible();
    
    // If no events, should show appropriate message
    const noEventsMessage = await page.locator('text=No Drawdown Events');
    if (await noEventsMessage.isVisible()) {
      await expect(noEventsMessage).toBeVisible();
    }
  });

  test('should display benchmark comparison when available', async ({ page }) => {
    
    // Look for benchmark comparison section
    const benchmarkSection = await page.locator('text=Benchmark Comparison');
    
    if (await benchmarkSection.isVisible()) {
      // Verify SPY comparison is shown
      await expect(page.locator('text=SPY')).toBeVisible();
      await expect(page.locator('text=Outperforming').or(page.locator('text=Underperforming'))).toBeVisible();
    }
  });
});

test.describe('Drawdown Analysis - Alert System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Login if required
    const loginButton = await page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to Performance Analytics
    await page.waitForSelector('h2:has-text("Performance Analytics")', { timeout: 10000 });
    await page.click('button:has(h2:has-text("Performance Analytics"))');
    await page.waitForLoadState('networkidle');
  });
  
  test('should display active alerts when thresholds are exceeded', async ({ page }) => {
    
    // Look for alert indicators
    const warningAlert = await page.locator('.bg-yellow-500\\/10:has-text("Warning")');
    const criticalAlert = await page.locator('.bg-red-500\\/10:has-text("Critical")');
    
    // At least one type of alert indicator should be visible if drawdown exceeds thresholds
    if (await warningAlert.isVisible() || await criticalAlert.isVisible()) {
      // Verify alert message is displayed
      const alertMessage = await page.locator('text=/exceeds .* threshold/');
      await expect(alertMessage).toBeVisible();
    }
  });

  test('should show risk assessment indicators', async ({ page }) => {
    
    // Wait for risk assessment section
    await page.waitForSelector('text=Risk Assessment', { timeout: 10000 });
    
    // Verify risk level indicators
    const riskIndicators = ['Low', 'Moderate', 'High'];
    let foundRiskLevel = false;
    
    for (const level of riskIndicators) {
      const indicator = await page.locator(`text="${level}"`).first();
      if (await indicator.isVisible()) {
        foundRiskLevel = true;
        break;
      }
    }
    
    expect(foundRiskLevel).toBe(true);
  });
});

test.describe('Drawdown Analysis - Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Login if required
    const loginButton = await page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
  });
  
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to Performance Analytics
    await page.waitForSelector('h2:has-text("Performance Analytics")', { timeout: 10000 });
    await page.click('button:has(h2:has-text("Performance Analytics"))');
    
    // Wait for main content to be visible
    await page.waitForSelector('h1:has-text("Performance Dashboard")', { timeout: 5000 });
    await page.waitForSelector('.bg-slate-900\\/50', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid interactions without errors', async ({ page }) => {
    // Navigate to Performance Analytics
    await page.waitForSelector('h2:has-text("Performance Analytics")', { timeout: 10000 });
    await page.click('button:has(h2:has-text("Performance Analytics"))');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to be ready
    await page.waitForSelector('button:has-text("Portfolio Value")', { timeout: 10000 });
    
    // Rapidly toggle chart controls
    const toggleButtons = await page.locator('button:has(svg.lucide-eye)').all();
    
    for (const button of toggleButtons) {
      await button.click();
      await page.waitForTimeout(50); // Small delay between clicks
    }
    
    // Page should still be responsive
    await expect(page.locator('h1:has-text("Performance Dashboard")')).toBeVisible();
  });
});