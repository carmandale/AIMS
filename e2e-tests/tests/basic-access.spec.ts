import { test, expect } from '@playwright/test';

test('Can access AIMS application', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3002');
  
  // Wait for any h1 element to be visible
  await page.waitForSelector('h1', { timeout: 10000 });
  
  // Get the h1 text
  const h1Text = await page.locator('h1').first().textContent();
  console.log('H1 text found:', h1Text);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/basic-access.png' });
  
  // Check if we're on login page or home page
  const loginButton = await page.locator('button:has-text("Login")').count();
  const signInButton = await page.locator('button:has-text("Sign in")').count();
  
  if (loginButton > 0 || signInButton > 0) {
    console.log('Found login/sign in button');
    expect(loginButton + signInButton).toBeGreaterThan(0);
  } else {
    // We might already be logged in
    console.log('No login button found, checking for AIMS heading');
    const aimsHeading = await page.locator('h1:has-text("AIMS")').count();
    expect(aimsHeading).toBeGreaterThan(0);
  }
});