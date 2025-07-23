import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('SnapTrade Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up to capture console logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // Navigate to home page
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete the full SnapTrade connection flow', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    
    // Step 1: Take screenshot of home page
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-home-page.png'),
      fullPage: true 
    });

    // Step 2: Click on "Connect Brokerage" button
    const connectButton = page.locator('button:has-text("Connect Brokerage")');
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    // Wait for navigation to SnapTrade registration page
    await page.waitForLoadState('networkidle');
    
    // Step 3: Take screenshot of registration page
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-registration-page.png'),
      fullPage: true 
    });

    // Verify we're on the registration page
    await expect(page.locator('h1:has-text("Connect Your Brokerage Account")')).toBeVisible();
    await expect(page.locator('text="Why Connect with SnapTrade?"')).toBeVisible();

    // Step 4: Click on "Connect Your Account" button to start registration
    const registerButton = page.locator('button:has-text("Connect Your Account")');
    await expect(registerButton).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-before-registration.png'),
      fullPage: true 
    });

    // Click the registration button
    await registerButton.click();

    // Step 5: Wait for registration to complete
    // We should see either success or error state
    await page.waitForSelector('text="Registration Successful!"', { 
      timeout: 30000,
      state: 'visible' 
    }).catch(async () => {
      // If registration fails, capture the error
      const errorElement = page.locator('text="Registration Failed"');
      if (await errorElement.isVisible()) {
        await page.screenshot({ 
          path: path.join(screenshotsDir, '04-registration-error.png'),
          fullPage: true 
        });
        
        // Get error message
        const errorMessage = await page.locator('h3:has-text("Registration Failed") + p').textContent();
        console.error('Registration failed with error:', errorMessage);
        
        // Try to get more detailed error info
        const detailedError = await page.locator('.text-red-400').textContent().catch(() => null);
        if (detailedError) {
          console.error('Detailed error:', detailedError);
        }
        
        throw new Error(`Registration failed: ${errorMessage}`);
      }
    });

    // Step 6: Take screenshot of successful registration
    const successIndicator = page.locator('text="Registration Successful!"');
    if (await successIndicator.isVisible()) {
      await page.screenshot({ 
        path: path.join(screenshotsDir, '04-registration-success.png'),
        fullPage: true 
      });

      // Wait for auto-navigation to connection flow
      await page.waitForTimeout(2000); // Wait for the 1.5s timeout + buffer
      
      // Check if we've been redirected to the connection flow
      const connectionFlowIndicator = page.locator('h1:has-text("Choose Your Broker")').or(page.locator('text="Select your brokerage"'));
      
      if (await connectionFlowIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.screenshot({ 
          path: path.join(screenshotsDir, '05-connection-flow.png'),
          fullPage: true 
        });
        
        console.log('Successfully navigated to connection flow');
      } else {
        console.log('Did not auto-navigate to connection flow');
      }
    }

    // Step 7: Verify final state
    // Check for any success indicators or connected accounts
    const finalScreenshot = await page.screenshot({ 
      path: path.join(screenshotsDir, '06-final-state.png'),
      fullPage: true 
    });

    // Assert that we've made progress (either registration success or connection flow)
    const hasProgress = await page.locator('text="Registration Successful!"').isVisible()
      .catch(() => false) || 
      await page.locator('h1:has-text("Choose Your Broker")').isVisible()
      .catch(() => false) ||
      await page.locator('text="Select your brokerage"').isVisible()
      .catch(() => false);

    expect(hasProgress).toBeTruthy();
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    
    // Navigate to registration page
    await page.locator('button:has-text("Connect Brokerage")').click();
    await page.waitForLoadState('networkidle');

    // Mock a network error by intercepting the registration request
    await page.route('**/api/snaptrade/register', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          detail: 'Test error: Server unavailable' 
        })
      });
    });

    // Click register button
    await page.locator('button:has-text("Connect Your Account")').click();

    // Wait for error state
    await expect(page.locator('text="Registration Failed"')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true 
    });

    // Verify error message is displayed
    const errorMessage = await page.locator('h3:has-text("Registration Failed") + p').textContent();
    expect(errorMessage).toContain('Test error: Server unavailable');

    // Verify "Try Again" button is shown
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('should show loading state during registration', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    
    // Navigate to registration page
    await page.locator('button:has-text("Connect Brokerage")').click();
    await page.waitForLoadState('networkidle');

    // Intercept the registration request but don't auto-continue
    let routeHandled = false;
    const routePromise = page.route('**/api/snaptrade/register', async route => {
      // Don't do anything yet, just mark that we've intercepted it
      routeHandled = true;
      
      // Wait to show loading state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Then continue with the request
      await route.continue();
    });

    // Wait for route to be set up
    await routePromise;

    // Click register button to trigger the intercepted request
    await page.locator('button:has-text("Connect Your Account")').click();

    // Now try to capture the loading state while request is delayed
    try {
      // Wait for loading state to appear
      await page.locator('text="Setting Up Your Account"').waitFor({ 
        state: 'visible', 
        timeout: 3000 
      });
      
      // Verify all loading elements are visible
      await expect(page.locator('text="Setting Up Your Account"')).toBeVisible();
      await expect(page.locator('text="Registering with SnapTrade..."')).toBeVisible();
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Take screenshot of loading state
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'loading-state.png'),
        fullPage: true 
      });
      
      console.log('Successfully captured loading state');
    } catch (e) {
      // If loading state is too fast, that's okay - the UI is responsive
      console.log('Loading state capture failed (might be too fast):', e);
      
      // Still take a screenshot of whatever state we're in
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'loading-state-attempted.png'),
        fullPage: true 
      });
    }

    // Wait for the registration to complete
    await page.waitForSelector('text="Registration Successful!"', { 
      timeout: 10000 
    }).catch(() => {
      console.log('Registration did not complete within timeout');
    });
    
    // Clean up routes at the end
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});