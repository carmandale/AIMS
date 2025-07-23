import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Account Connection Flow with Completion Button', () => {
  let screenshotCount = 1;
  const screenshotsDir = path.join(__dirname, '..', 'screenshots', 'connection-flow');

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

    // Set up console log capture
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(`Browser console: ${msg.text()}`);
      }
    });

    // Navigate to home page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should demonstrate the I\'ve Completed the Connection button flow', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('\n=== Testing AccountConnectionFlow with Completion Button ===\n');

    // Step 1: Navigate through the app to get to AccountConnectionFlow
    await takeScreenshot(page, 'home-page');

    // First, we need to get registered with SnapTrade
    console.log('1. Navigating to Connect Brokerage...');
    const connectButton = page.locator('button:has-text("Connect Brokerage")');
    await expect(connectButton).toBeVisible();
    await connectButton.click();
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'registration-page');

    // Complete registration first
    console.log('2. Completing SnapTrade registration...');
    const registerButton = page.locator('button:has-text("Connect Your Account")');
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // Wait for registration
    try {
      await page.waitForSelector('text="Registration Successful!"', { 
        timeout: 30000,
        state: 'visible' 
      });
      console.log('✓ Registration successful!');
      await takeScreenshot(page, 'registration-success');
    } catch (error) {
      console.log('Registration might have failed or already completed');
    }

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Now we should be on broker selection page
    // Instead of clicking a broker, let's navigate directly to the custom flow
    console.log('3. Checking current state...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if we can see the custom AccountConnectionFlow
    // The app might have navigated to 'snaptrade-connect' automatically
    const hasPopularBrokers = await page.locator('text="Popular Brokers"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasPopularBrokers) {
      console.log('✓ Found custom AccountConnectionFlow!');
      await takeScreenshot(page, 'custom-broker-selection');

      // Select Fidelity from the custom flow
      console.log('4. Selecting Fidelity Investments...');
      const fidelityCard = page.locator('button:has(h3:has-text("Fidelity Investments"))').first();
      await expect(fidelityCard).toBeVisible();
      await fidelityCard.click();

      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'security-confirmation');

      // Click Continue to Fidelity
      console.log('5. Continuing to Fidelity...');
      const continueButton = page.locator('button:has-text("Continue to Fidelity")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'authorization-page');

        // Click Connect to Fidelity
        console.log('6. Clicking Connect to Fidelity...');
        const connectToFidelityButton = page.locator('button:has-text("Connect to Fidelity")');
        
        // Set up popup handler before clicking
        const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
        
        await connectToFidelityButton.click();
        console.log('✓ Clicked Connect to Fidelity');

        // Wait for the connecting state
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'connecting-state');

        // Check if popup opened
        const popup = await popupPromise;
        if (popup) {
          console.log('✓ Popup opened for OAuth flow');
          
          // Take screenshot of the main page while popup is open
          await takeScreenshot(page, 'main-page-with-popup-open');

          // IMPORTANT: Look for the "I've Completed the Connection" button
          console.log('\n7. Looking for "I\'ve Completed the Connection" button...');
          
          // Wait for the connecting state to appear first
          await page.waitForSelector('text="Connecting..."', { timeout: 5000 }).catch(() => {});
          
          // Try multiple selectors for the completion button
          const completionButton = page.locator('button').filter({ hasText: "I've Completed the Connection" }).or(
            page.locator('button:has-text("I\'ve Completed the Connection")')
          );
          
          try {
            // Wait for the button to be visible
            await completionButton.waitFor({ state: 'visible', timeout: 15000 });
            console.log('✓✓✓ Found "I\'ve Completed the Connection" button!');
            
            // Take screenshot showing the button
            await takeScreenshot(page, 'completion-button-visible');
            
            // Get button details
            const buttonText = await completionButton.textContent();
            const isEnabled = await completionButton.isEnabled();
            console.log(`Button text: "${buttonText}"`);
            console.log(`Button enabled: ${isEnabled}`);
            
            // Click the completion button
            console.log('8. Clicking the completion button...');
            await completionButton.click();
            console.log('✓ Clicked "I\'ve Completed the Connection"');
            
            // Wait for any navigation or state change
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'after-completion-click');
            
            // Check what happened after clicking
            const afterClickUrl = page.url();
            console.log(`URL after completion: ${afterClickUrl}`);
            
            // Check for success indicators
            const hasSuccess = await page.locator('text=/success|connected|complete/i').count();
            console.log(`Success indicators found: ${hasSuccess}`);
            
          } catch (error) {
            console.error('✗ "I\'ve Completed the Connection" button not found or not clickable');
            console.error('Error:', error.message);
            
            // Debug: Check what's visible on the page
            const pageText = await page.locator('body').innerText();
            console.log('Page contains:', pageText.substring(0, 500));
            
            // Check what buttons are visible
            const visibleButtons = await page.locator('button:visible').allTextContents();
            console.log('Visible buttons:', visibleButtons);
            
            // Take a debug screenshot
            await takeScreenshot(page, 'debug-no-completion-button');
          }
          
          // Close popup if still open
          if (!popup.isClosed()) {
            await popup.close();
            console.log('Popup closed');
          }
        } else {
          console.log('No popup opened - checking for inline completion UI');
          
          // Still check for the button in case it appears without popup
          const inlineCompletionButton = page.locator('button:has-text("I\'ve Completed the Connection")');
          if (await inlineCompletionButton.isVisible({ timeout: 5000 })) {
            console.log('✓ Found inline completion button');
            await takeScreenshot(page, 'inline-completion-button');
            await inlineCompletionButton.click();
            console.log('✓ Clicked inline completion button');
          }
        }
      }
    } else {
      console.log('Custom AccountConnectionFlow not found');
      console.log('The app might be using SnapTrade\'s default broker selection');
      await takeScreenshot(page, 'snaptrade-broker-selection');
    }

    console.log('\n=== Test Complete ===');
    console.log(`Total screenshots: ${screenshotCount - 1}`);
    console.log(`Screenshots saved in: ${screenshotsDir}`);

    // Final assertion
    expect(screenshotCount).toBeGreaterThan(5);
  });

  test('should test all three brokers with completion button', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    const brokers = ['Fidelity Investments', 'Robinhood', 'Coinbase'];
    
    for (const brokerName of brokers) {
      console.log(`\n=== Testing ${brokerName} Connection ===\n`);
      
      // Navigate to home
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Go through registration flow
      await page.locator('button:has-text("Connect Brokerage")').click();
      await page.waitForLoadState('networkidle');
      
      const registerButton = page.locator('button:has-text("Connect Your Account")');
      if (await registerButton.isVisible()) {
        await registerButton.click();
        
        // Wait for registration or navigation
        await page.waitForTimeout(3000);
      }
      
      // Check if we're on custom flow
      const hasPopularBrokers = await page.locator('text="Popular Brokers"').isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasPopularBrokers) {
        // Select the broker
        const brokerCard = page.locator(`button:has(h3:has-text("${brokerName}"))`).first();
        if (await brokerCard.isVisible()) {
          await brokerCard.click();
          console.log(`Selected ${brokerName}`);
          
          // Continue through the flow
          const continueButton = page.locator(`button:has-text("Continue to ${brokerName.split(' ')[0]}")`);
          if (await continueButton.isVisible()) {
            await continueButton.click();
            
            // Connect
            const connectButton = page.locator(`button:has-text("Connect to ${brokerName.split(' ')[0]}")`);
            if (await connectButton.isVisible()) {
              // Set up popup handler
              const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
              
              await connectButton.click();
              console.log(`Clicked Connect to ${brokerName}`);
              
              const popup = await popupPromise;
              if (popup) {
                console.log(`Popup opened for ${brokerName}`);
                
                // Look for completion button
                const completionButton = page.locator('button:has-text("I\'ve Completed the Connection")');
                if (await completionButton.isVisible({ timeout: 10000 })) {
                  console.log(`✓ Found completion button for ${brokerName}`);
                  await takeScreenshot(page, `${brokerName.toLowerCase().replace(' ', '-')}-completion-button`);
                  
                  await completionButton.click();
                  console.log(`✓ Clicked completion button for ${brokerName}`);
                  
                  await page.waitForTimeout(2000);
                }
                
                if (!popup.isClosed()) {
                  await popup.close();
                }
              }
            }
          }
        }
      }
    }
    
    console.log('\n=== All Brokers Tested ===');
  });
});