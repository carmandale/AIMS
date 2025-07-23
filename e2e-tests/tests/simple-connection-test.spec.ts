import { test, expect } from '@playwright/test';

test.describe('Simple Connection Test', () => {
  test('should show the completion button after clicking connect', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:5173');
    
    // Click Connect Brokerage
    await page.click('text=Connect Brokerage');
    
    // Wait for registration to complete
    await page.waitForTimeout(3000);
    
    // Look for broker selection
    const hasFidelity = await page.locator('text=Fidelity Investments').isVisible();
    console.log('Has Fidelity:', hasFidelity);
    
    if (hasFidelity) {
      // Click Fidelity
      await page.click('text=Fidelity Investments');
      await page.waitForTimeout(1000);
      
      // Click Connect button
      const connectButton = page.locator('button:has-text("Connect to Fidelity")');
      if (await connectButton.isVisible()) {
        console.log('Found Connect button, clicking...');
        await connectButton.click();
        
        // Wait and check what appears
        await page.waitForTimeout(2000);
        
        // Take screenshot
        await page.screenshot({ path: 'after-connect-click.png' });
        
        // Check for completion button
        const completionButton = page.locator('button:has-text("I\'ve Completed the Connection")');
        if (await completionButton.isVisible()) {
          console.log('✓ Completion button is visible!');
        } else {
          console.log('✗ Completion button NOT visible');
          
          // Debug what's on the page
          const pageText = await page.locator('body').innerText();
          console.log('Page contains:', pageText.substring(0, 200));
        }
      }
    }
  });
});