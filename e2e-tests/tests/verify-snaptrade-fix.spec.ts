import { test, expect } from '@playwright/test';

test.describe('Verify SnapTrade Fix', () => {
  test('should successfully connect to SnapTrade after encryption fix', async ({ page }) => {
    // Navigate to the app on the correct port
    await page.goto('http://localhost:3003');
    
    // Check if we need to login
    const signInButton = page.locator('text=Sign In');
    if (await signInButton.isVisible()) {
      console.log('Login required...');
      await signInButton.click();
      
      // Fill login form
      await page.fill('input[name="email"]', 'dale.carman@gmail.com');
      await page.fill('input[name="password"]', 'test123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      // Wait for redirect to home
      await page.waitForURL('http://localhost:3003/');
      console.log('Logged in successfully');
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for SnapTrade connection button
    const connectButton = page.locator('button:has-text("Connect SnapTrade"), button:has-text("Connect Brokerage"), button:has-text("Link Account")').first();
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'before-connect.png' });
    
    // Click the connect button
    await connectButton.click();
    console.log('Clicked connect button');
    
    // Wait for the response
    await page.waitForTimeout(3000);
    
    // Check for success indicators
    const successMessages = [
      'already registered',
      'registered successfully',
      'Connect your brokerage',
      'Select your broker'
    ];
    
    let foundSuccess = false;
    for (const message of successMessages) {
      if (await page.locator(`text="${message}"`).isVisible()) {
        console.log(`Found success message: ${message}`);
        foundSuccess = true;
        break;
      }
    }
    
    // Check if a new window/popup opened (SnapTrade connection URL)
    const newPagePromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
    const newPage = await newPagePromise;
    
    if (newPage) {
      console.log('New window opened - SnapTrade connection URL working!');
      await newPage.close();
      foundSuccess = true;
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'after-connect.png' });
    
    // Check for errors
    const errorElement = page.locator('.text-red-500, .text-destructive, [role="alert"]').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.error(`Error found: ${errorText}`);
      
      // The old error we were getting
      if (errorText?.includes('User must be registered with SnapTrade first')) {
        throw new Error('ENCRYPTION FIX FAILED - Still getting the old error!');
      }
    }
    
    // Assert success
    expect(foundSuccess).toBe(true);
    console.log('✅ SnapTrade integration is working after fix!');
  });
});