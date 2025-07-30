import { test, expect } from '@playwright/test';

test.describe('SnapTrade Connection Debug', () => {
  test('debug brokerage connection flow', async ({ page }) => {
    // Listen for console logs and network requests
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('requestfailed', request => console.log('FAILED REQUEST:', request.url(), request.failure()?.errorText));
    page.on('response', response => {
      if (!response.ok()) {
        console.log('FAILED RESPONSE:', response.url(), response.status(), response.statusText());
      }
    });

    // Navigate to the application
    console.log('🔍 Navigating to AIMS application...');
    await page.goto('http://localhost:3002');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'debug-1-initial.png' });
    
    // Check if already logged in or need to register/login
    const hasConnectButton = await page.locator('text=Connect Brokerage').isVisible({ timeout: 5000 });
    const hasLoginForm = await page.locator('input[name="email"]').isVisible({ timeout: 2000 });
    const hasRegisterForm = await page.locator('text=Create Account').isVisible({ timeout: 2000 });
    
    console.log('Has Connect Button:', hasConnectButton);
    console.log('Has Login Form:', hasLoginForm);  
    console.log('Has Register Form:', hasRegisterForm);

    if (hasLoginForm) {
      console.log('🔑 Logging in with test credentials...');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-2-after-login.png' });
    } else if (hasRegisterForm) {
      console.log('📝 Registering new test account...');
      await page.click('text=Create Account');
      await page.waitForTimeout(1000);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="fullName"]', 'Test User');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-2-after-register.png' });
    }
    
    // Look for Connect Brokerage button
    const connectButton = page.locator('text=Connect Brokerage');
    if (await connectButton.isVisible({ timeout: 5000 })) {
      console.log('🔗 Found Connect Brokerage button, clicking...');
      await connectButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'debug-3-after-connect-click.png' });
    } else {
      console.log('❌ Connect Brokerage button not found');
      const pageContent = await page.content();
      console.log('Page content preview:', pageContent.substring(0, 500));
      return;
    }
    
    // Check if broker selection appears
    const fidelityButton = page.locator('text=Fidelity Investments');
    if (await fidelityButton.isVisible({ timeout: 5000 })) {
      console.log('🏦 Found broker selection, clicking Fidelity...');
      await fidelityButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-4-after-broker-select.png' });
      
      // Look for security confirmation button
      const continueButton = page.locator('button:has-text("Continue to Fidelity")');
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('🔒 Found security confirmation, clicking continue...');
        await continueButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug-5-after-security-confirm.png' });
        
        // Look for final connect button
        const finalConnectButton = page.locator('button:has-text("Connect to Fidelity")');
        if (await finalConnectButton.isVisible({ timeout: 3000 })) {
          console.log('🚀 Found final connect button, clicking...');
          await finalConnectButton.click();
          await page.waitForTimeout(5000);
          await page.screenshot({ path: 'debug-6-after-final-connect.png' });
          
          // Check what happens after connection attempt
          const completionButton = page.locator('button:has-text("I\'ve Completed the Connection")');
          const errorMessage = page.locator('text=Connection Failed');
          
          if (await completionButton.isVisible({ timeout: 3000 })) {
            console.log('✅ Completion button appeared - connection flow working!');
          } else if (await errorMessage.isVisible({ timeout: 3000 })) {
            console.log('❌ Error message appeared');
            const errorText = await page.locator('div').filter({ hasText: 'Connection Failed' }).textContent();
            console.log('Error details:', errorText);
          } else {
            console.log('🤔 Unexpected state after connection attempt');
            const pageText = await page.locator('body').textContent();
            console.log('Page content:', pageText?.substring(0, 500));
          }
        } else {
          console.log('❌ Final connect button not found');
        }
      } else {
        console.log('❌ Security confirmation button not found');
      }
    } else {
      console.log('❌ Broker selection not found');
      // Check for any error messages
      const errorElements = await page.locator('[role="alert"], .error, .alert-error').all();
      for (const error of errorElements) {
        const errorText = await error.textContent();
        console.log('Error found:', errorText);
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'debug-7-final-state.png' });
    console.log('🏁 Debug test completed - check screenshots for visual debugging');
  });
});