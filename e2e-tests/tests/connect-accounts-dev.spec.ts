import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Connect Accounts - Development Test', () => {
  let screenshotCount = 1;
  const screenshotsDir = path.join(__dirname, '..', 'screenshots', 'dev-connection');

  // Helper function to take numbered screenshots
  async function takeScreenshot(page: Page, description: string) {
    const filename = `${String(screenshotCount).padStart(2, '0')}-${description.toLowerCase().replace(/\s+/g, '-')}.png`;
    await page.screenshot({ 
      path: path.join(screenshotsDir, filename),
      fullPage: true 
    });
    screenshotCount++;
    console.log(`Screenshot taken: ${filename}`);
  }

  test.beforeEach(async ({ page }) => {
    // Reset screenshot counter
    screenshotCount = 1;
    
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Navigate to home page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should demonstrate the new connection flow with completion button', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('\n=== Starting Connection Flow Test ===\n');

    // Step 1: Home page
    await takeScreenshot(page, 'home-page');
    
    // Step 2: Navigate to Connect Brokerage
    console.log('Navigating to Connect Brokerage...');
    const connectButton = page.locator('button:has-text("Connect Brokerage")');
    await expect(connectButton).toBeVisible();
    await connectButton.click();
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'registration-page');
    
    // Step 3: Start registration
    console.log('Starting SnapTrade registration...');
    const registerButton = page.locator('button:has-text("Connect Your Account")');
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Wait for registration to complete
    try {
      await page.waitForSelector('text="Registration Successful!"', { 
        timeout: 30000,
        state: 'visible' 
      });
      console.log('✓ Registration successful!');
      await takeScreenshot(page, 'registration-success');
      
      // Wait for navigation
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('Registration failed or timed out');
      await takeScreenshot(page, 'registration-failed');
    }

    // Step 4: Check current state
    console.log('\nChecking current page state...');
    
    // Check if we're on SnapTrade's broker selection
    const onBrokerSelection = await page.locator('h1:has-text("Choose Your Broker")').isVisible().catch(() => false);
    const hasSearchInput = await page.locator('input[placeholder*="Search brokers"]').isVisible().catch(() => false);
    const hasFidelity = await page.locator('text="Fidelity Investments"').isVisible().catch(() => false);
    
    console.log(`- On broker selection page: ${onBrokerSelection}`);
    console.log(`- Has search input: ${hasSearchInput}`);
    console.log(`- Fidelity visible: ${hasFidelity}`);
    
    await takeScreenshot(page, 'current-state');

    // Step 5: Try to connect to Fidelity
    if (hasFidelity) {
      console.log('\nAttempting to connect to Fidelity...');
      
      // Find and click Fidelity
      const fidelityCard = page.locator('div:has-text("Fidelity Investments")').first();
      
      // Set up popup handler
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
      
      // Click Fidelity
      await fidelityCard.click();
      console.log('Clicked on Fidelity');
      
      // Check for popup
      const popup = await popupPromise;
      if (popup) {
        console.log('✓ Popup opened!');
        await takeScreenshot(page, 'main-page-with-popup');
        
        // Wait a moment for any UI updates
        await page.waitForTimeout(2000);
        
        // Look for completion button
        console.log('Looking for "I\'ve Completed the Connection" button...');
        
        const completionButton = page.locator('button').filter({ 
          hasText: /I've Completed the Connection|Connection Complete|Complete Connection/i 
        });
        
        const buttonCount = await completionButton.count();
        console.log(`Found ${buttonCount} potential completion button(s)`);
        
        if (buttonCount > 0) {
          console.log('✓ Found completion button!');
          await takeScreenshot(page, 'completion-button-visible');
          
          // Get button text
          const buttonText = await completionButton.first().textContent();
          console.log(`Button text: "${buttonText}"`);
          
          // Click the button
          await completionButton.first().click();
          console.log('✓ Clicked completion button');
          
          await page.waitForTimeout(2000);
          await takeScreenshot(page, 'after-completion-click');
        } else {
          console.log('✗ No completion button found');
          
          // Check what's visible on the page
          const visibleButtons = await page.locator('button:visible').allTextContents();
          console.log('Visible buttons:', visibleButtons);
        }
        
        // Close popup if still open
        if (!popup.isClosed()) {
          await popup.close();
        }
      } else {
        console.log('No popup opened - checking for inline flow');
        await takeScreenshot(page, 'no-popup-state');
        
        // Check for any completion UI
        const anyCompletionUI = await page.locator('text=/complete|done|finish/i').count();
        console.log(`Found ${anyCompletionUI} completion-related UI elements`);
      }
    } else {
      console.log('Fidelity not found on page - taking debug screenshot');
      await takeScreenshot(page, 'no-brokers-found');
      
      // Log what we can see
      const pageText = await page.locator('body').innerText();
      console.log('Page contains:', pageText.substring(0, 200) + '...');
    }

    console.log('\n=== Test Complete ===');
    console.log(`Total screenshots: ${screenshotCount - 1}`);
    console.log(`View at: ${screenshotsDir}`);
  });

  test('should test the custom AccountConnectionFlow component', async ({ page }) => {
    console.log('\n=== Testing Custom AccountConnectionFlow ===\n');

    // Navigate directly to a route that uses AccountConnectionFlow
    // This assumes there's a route that shows this component
    await page.goto('http://localhost:5173/connect/flow');
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, 'connection-flow-component');

    // Check if we're on the custom flow
    const hasCustomBrokerSelection = await page.locator('text="Popular Brokers"').isVisible().catch(() => false);
    
    if (hasCustomBrokerSelection) {
      console.log('✓ Found custom AccountConnectionFlow component');
      
      // Click on Fidelity
      const fidelityButton = page.locator('button:has(h3:has-text("Fidelity Investments"))').first();
      if (await fidelityButton.isVisible()) {
        await fidelityButton.click();
        console.log('Clicked Fidelity in custom flow');
        
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'after-broker-selection');
        
        // Continue through the flow
        const continueButton = page.locator('button:has-text("Continue to Fidelity")');
        if (await continueButton.isVisible()) {
          await continueButton.click();
          console.log('Clicked Continue to Fidelity');
          
          await page.waitForTimeout(1000);
          await takeScreenshot(page, 'authorization-step');
          
          // Click Connect
          const connectButton = page.locator('button:has-text("Connect to Fidelity")');
          if (await connectButton.isVisible()) {
            await connectButton.click();
            console.log('Clicked Connect to Fidelity');
            
            // Wait for connection state
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'connecting-state');
            
            // Look for completion button
            const completionButton = page.locator('button:has-text("I\'ve Completed the Connection")');
            if (await completionButton.isVisible()) {
              console.log('✓ Found "I\'ve Completed the Connection" button in custom flow!');
              await takeScreenshot(page, 'custom-flow-completion-button');
            }
          }
        }
      }
    } else {
      console.log('Custom AccountConnectionFlow not found at /connect/flow');
    }
  });
});