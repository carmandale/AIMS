import { test, expect } from '@playwright/test';

test('Can navigate to Performance Analytics', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3002');
  
  // Take a screenshot of initial page
  await page.screenshot({ path: 'test-results/initial-page.png' });
  
  // Check if we're on the login page
  const loginButton = await page.locator('button:has-text("Login")');
  if (await loginButton.isVisible()) {
    console.log('Login page detected, attempting login...');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await loginButton.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/after-login.png' });
  }
  
  // Wait for home page
  await page.waitForSelector('h1:has-text("AIMS")', { timeout: 30000 });
  await page.screenshot({ path: 'test-results/home-page.png' });
  
  // Look for Performance Analytics button
  const perfButton = await page.locator('button:has-text("Performance Analytics")');
  await expect(perfButton).toBeVisible();
  
  // Click it
  await perfButton.click();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/performance-page.png' });
  
  // Verify we're on the performance page
  await expect(page.locator('h1')).toBeVisible();
  const h1Text = await page.locator('h1').textContent();
  console.log('H1 text:', h1Text);
});