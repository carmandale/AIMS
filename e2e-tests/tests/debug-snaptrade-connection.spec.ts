import { test, expect } from '@playwright/test';

test.describe('SnapTrade Connection Debug', () => {
  test('Debug connection flow with network and console monitoring', async ({ page }) => {
    // Track all network requests
    const networkRequests: Array<{
      url: string;
      method: string;
      status?: number;
      response?: any;
      timestamp: number;
    }> = [];

    // Track console messages
    const consoleMessages: Array<{
      type: string;
      text: string;
      timestamp: number;
    }> = [];

    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    page.on('response', async response => {
      const request = networkRequests.find(req => 
        req.url === response.url() && !req.status
      );
      if (request) {
        request.status = response.status();
        try {
          if (response.url().includes('/api/')) {
            const responseText = await response.text();
            request.response = responseText;
            console.log(`[RESPONSE] ${response.status()} ${response.url()}: ${responseText}`);
          }
        } catch (e) {
          console.log(`[RESPONSE] ${response.status()} ${response.url()}: [Could not read body]`);
        }
      }
    });

    // Monitor console messages
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      };
      consoleMessages.push(message);
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Monitor page errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    console.log('=== STARTING SNAPTRADE CONNECTION DEBUG ===');

    // Step 1: Navigate to app
    console.log('Step 1: Navigating to app...');
    await page.goto('http://localhost:3002');
    await page.screenshot({ path: 'debug-step-1-home.png', fullPage: true });

    // Step 2: Login (if needed)
    console.log('Step 2: Checking login state...');
    const loginButton = page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      console.log('Not logged in, attempting login...');
      await loginButton.click();
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation after login
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await page.screenshot({ path: 'debug-step-2-login.png', fullPage: true });
    }

    // Step 3: Navigate to account connection
    console.log('Step 3: Navigating to account connection...');
    await page.goto('http://localhost:3002/accounts/connect');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug-step-3-connect-page.png', fullPage: true });

    // Step 4: Click connect account button
    console.log('Step 4: Clicking connect account button...');
    const connectButton = page.locator('button:has-text("Connect Account")').first();
    await expect(connectButton).toBeVisible({ timeout: 10000 });
    
    console.log('Network requests before connect click:', networkRequests.length);
    await connectButton.click();
    
    // Wait for connection URL to be generated
    await page.waitForTimeout(2000);
    console.log('Network requests after connect click:', networkRequests.length);
    await page.screenshot({ path: 'debug-step-4-connect-clicked.png', fullPage: true });

    // Step 5: Look for SnapTrade redirect or connection dialog
    console.log('Step 5: Looking for SnapTrade interface...');
    
    // Check if we have a SnapTrade URL in any network request
    const snaptradeRequests = networkRequests.filter(req => 
      req.url.includes('snaptrade') || req.url.includes('connect')
    );
    console.log('SnapTrade-related requests:', snaptradeRequests);

    // Look for any popup or iframe with SnapTrade
    const snaptradeFrame = page.frameLocator('iframe[src*="snaptrade"]');
    const snaptradePopup = page.locator('[data-testid="snaptrade-popup"]');
    
    if (await snaptradeFrame.locator('body').isVisible().catch(() => false)) {
      console.log('Found SnapTrade iframe');
      await page.screenshot({ path: 'debug-step-5-snaptrade-iframe.png', fullPage: true });
    } else if (await snaptradePopup.isVisible().catch(() => false)) {
      console.log('Found SnapTrade popup');
      await page.screenshot({ path: 'debug-step-5-snaptrade-popup.png', fullPage: true });
    } else {
      console.log('No SnapTrade interface found, checking current page content...');
      const pageContent = await page.textContent('body');
      console.log('Current page content:', pageContent?.substring(0, 500));
      await page.screenshot({ path: 'debug-step-5-no-snaptrade.png', fullPage: true });
    }

    // Step 6: Simulate the connection completion
    console.log('Step 6: Simulating connection completion...');
    
    // Try to find and click a "Done" or "Complete" button
    const doneButton = page.locator('button:has-text("Done"), button:has-text("Complete"), button:has-text("Finish")');
    if (await doneButton.isVisible().catch(() => false)) {
      console.log('Found completion button, clicking...');
      
      const requestCountBefore = networkRequests.length;
      await doneButton.click();
      
      // Wait and monitor what happens
      await page.waitForTimeout(3000);
      const requestCountAfter = networkRequests.length;
      
      console.log(`Network requests before done: ${requestCountBefore}, after: ${requestCountAfter}`);
      await page.screenshot({ path: 'debug-step-6-done-clicked.png', fullPage: true });
    } else {
      console.log('No completion button found, manually triggering callback...');
      
      // Manually navigate to callback URL to test the flow
      const callbackUrl = 'http://localhost:3002/accounts/connect?code=test_code&state=test_state';
      await page.goto(callbackUrl);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-step-6-manual-callback.png', fullPage: true });
    }

    // Step 7: Monitor for the infinite loop
    console.log('Step 7: Monitoring for infinite loop behavior...');
    
    let loopDetected = false;
    let connectionCompleteCount = 0;
    const startTime = Date.now();
    const maxWaitTime = 15000; // 15 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      // Check if "Connection Complete" text appears
      const connectionCompleteText = page.locator('text="Connection Complete"');
      if (await connectionCompleteText.isVisible().catch(() => false)) {
        connectionCompleteCount++;
        console.log(`"Connection Complete" detected (count: ${connectionCompleteCount})`);
        
        if (connectionCompleteCount > 2) {
          loopDetected = true;
          console.log('INFINITE LOOP DETECTED!');
          break;
        }
      }
      
      // Check for rapid navigation changes
      const currentUrl = page.url();
      await page.waitForTimeout(1000);
      const newUrl = page.url();
      
      if (currentUrl !== newUrl) {
        console.log(`URL changed from ${currentUrl} to ${newUrl}`);
      }
      
      await page.screenshot({ 
        path: `debug-step-7-loop-check-${Date.now()}.png`, 
        fullPage: true 
      });
    }

    // Step 8: Final analysis
    console.log('=== FINAL ANALYSIS ===');
    console.log(`Total network requests: ${networkRequests.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Loop detected: ${loopDetected}`);
    console.log(`Current URL: ${page.url()}`);

    // Log all network requests
    console.log('\n=== ALL NETWORK REQUESTS ===');
    networkRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url} -> ${req.status || 'pending'}`);
      if (req.response && req.url.includes('/api/')) {
        console.log(`   Response: ${req.response.substring(0, 200)}`);
      }
    });

    // Log all console messages
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.type}] ${msg.text}`);
    });

    // Log callback-specific requests
    const callbackRequests = networkRequests.filter(req => 
      req.url.includes('/callback') || req.url.includes('processCallback')
    );
    console.log('\n=== CALLBACK REQUESTS ===');
    callbackRequests.forEach(req => {
      console.log(`${req.method} ${req.url} -> ${req.status}`);
      if (req.response) {
        console.log(`Response: ${req.response}`);
      }
    });

    // Take final screenshot
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });

    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      loopDetected,
      connectionCompleteCount,
      finalUrl: page.url(),
      totalNetworkRequests: networkRequests.length,
      totalConsoleMessages: consoleMessages.length,
      networkRequests: networkRequests.map(req => ({
        method: req.method,
        url: req.url,
        status: req.status,
        hasResponse: !!req.response
      })),
      consoleMessages: consoleMessages.map(msg => ({
        type: msg.type,
        text: msg.text
      })),
      callbackRequests: callbackRequests.map(req => ({
        method: req.method,
        url: req.url,
        status: req.status,
        response: req.response
      }))
    };

    console.log('\n=== WRITING DEBUG REPORT ===');
    await page.evaluate((report) => {
      console.log('FINAL DEBUG REPORT:', JSON.stringify(report, null, 2));
    }, report);
  });
});