import { test, expect } from '@playwright/test';

test('Manual navigation to Performance Dashboard', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3002');
  
  // For now, we'll assume the user is already logged in or will log in manually
  // This test will pause to allow manual interaction
  
  console.log('Application loaded. Please log in manually if needed.');
  
  // Pause the test to allow manual login
  await page.pause();
  
  // After manual login, the test will continue
  // Try to find and click Performance Analytics
  try {
    await page.click('button:has-text("Performance Analytics")', { timeout: 5000 });
    console.log('Clicked Performance Analytics');
    
    // Wait for the dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshots of the dashboard
    await page.screenshot({ path: 'test-results/manual-performance-dashboard.png', fullPage: true });
    
    // Check for drawdown sections
    const drawdownMetrics = await page.locator('text=Drawdown Metrics').count();
    console.log('Drawdown Metrics sections found:', drawdownMetrics);
    
    // Scroll to see more content
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.screenshot({ path: 'test-results/manual-performance-dashboard-scrolled.png', fullPage: true });
    
  } catch (error) {
    console.log('Could not find Performance Analytics button or error occurred:', error);
    await page.screenshot({ path: 'test-results/manual-test-error.png', fullPage: true });
  }
});