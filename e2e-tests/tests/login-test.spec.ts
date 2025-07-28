import { test, expect } from '@playwright/test';

test('Can login to AIMS', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3002');
  
  console.log('Page loaded');
  
  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/login-page.png' });
  
  // Fill in login form
  await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
  await page.fill('input[placeholder="Enter your password"]', 'testpassword');
  
  console.log('Credentials entered');
  
  // Click sign in button
  await page.click('button:has-text("Sign in")');
  
  console.log('Sign in clicked');
  
  // Wait for either success or error
  try {
    // Wait for navigation to home page
    await page.waitForSelector('h1:has-text("AIMS")', { timeout: 5000 });
    console.log('Login successful - found AIMS heading');
    
    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/home-page-after-login.png' });
    
    // Check for Performance Analytics button
    const perfButton = await page.locator('button:has-text("Performance Analytics")').count();
    console.log('Performance Analytics buttons found:', perfButton);
    
    expect(perfButton).toBeGreaterThan(0);
  } catch (error) {
    console.log('Login might have failed, checking for error messages');
    
    // Take screenshot of current state
    await page.screenshot({ path: 'test-results/login-error-state.png' });
    
    // Check for any error messages
    const errorText = await page.locator('.text-red-500, .text-red-600, [role="alert"]').first().textContent().catch(() => null);
    if (errorText) {
      console.log('Error message found:', errorText);
    }
    
    throw error;
  }
});