import { test, expect } from '@playwright/test';

test.describe('Debug SnapTrade Connection Loop', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3002');
    
    // Wait for login redirect
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // Login with test user
    await page.fill('input[type="email"]', 'test@aims.local');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for home page
    await page.waitForURL('http://localhost:3002/', { timeout: 5000 });
    await page.waitForSelector('text=AIMS', { timeout: 5000 });
  });

  test('Debug connection status and flow', async ({ page }) => {
    // Check localStorage for any stored state
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    console.log('LocalStorage:', localStorageData);

    // Click on Connect Brokerage
    await page.click('text=Connect Brokerage');
    
    // Wait for registration page
    await page.waitForSelector('text=Connect Your Brokerage Account', { timeout: 5000 });
    
    // Check current URL
    console.log('After clicking Connect Brokerage, URL:', page.url());
    
    // Try to register
    await page.click('button:has-text("Connect Your Account")');
    
    // Check the API response
    const registerResponse = await page.waitForResponse(
      response => response.url().includes('/api/snaptrade/register'),
      { timeout: 10000 }
    );
    console.log('Register response status:', registerResponse.status());
    const registerData = await registerResponse.json();
    console.log('Register response data:', registerData);
    
    // Wait for navigation to connection flow
    await page.waitForTimeout(2000);
    console.log('After registration, URL:', page.url());
    
    // If we're on the broker selection page, select one
    if (await page.isVisible('text=Choose Your Broker')) {
      await page.click('text=Fidelity Investments');
      await page.waitForTimeout(1000);
      
      // Continue through security confirmation
      if (await page.isVisible('text=Continue to')) {
        await page.click('button:has-text("Continue to")');
        await page.waitForTimeout(1000);
      }
      
      // Click Connect button
      if (await page.isVisible('text=Connect to')) {
        // Intercept the connection URL request
        const connectionPromise = page.waitForResponse(
          response => response.url().includes('/api/snaptrade/connect'),
          { timeout: 10000 }
        );
        
        await page.click('button:has-text("Connect to")');
        
        const connectionResponse = await connectionPromise;
        console.log('Connection URL response status:', connectionResponse.status());
        const connectionData = await connectionResponse.json();
        console.log('Connection URL data:', connectionData);
        
        // Wait for popup or manual connection option
        await page.waitForTimeout(3000);
        
        // Click "I've Completed the Connection" if visible
        if (await page.isVisible('text="I\'ve Completed the Connection"')) {
          console.log('Found completion button, clicking it...');
          
          // Intercept the accounts check
          const accountsPromise = page.waitForResponse(
            response => response.url().includes('/api/snaptrade/accounts'),
            { timeout: 10000 }
          );
          
          await page.click('text="I\'ve Completed the Connection"');
          
          const accountsResponse = await accountsPromise;
          console.log('Accounts response status:', accountsResponse.status());
          const accountsData = await accountsResponse.json();
          console.log('Accounts data:', accountsData);
          
          // Wait to see where we navigate
          await page.waitForTimeout(3000);
          console.log('After completion, URL:', page.url());
          
          // Check what's visible on the page
          const pageContent = await page.evaluate(() => {
            return {
              hasNoAccountsMessage: !!document.querySelector('text="No Accounts Connected Yet"'),
              hasConnectAnotherButton: !!document.querySelector('text="Connect Another Account"'),
              hasChooseBrokerText: !!document.querySelector('text="Choose Your Broker"'),
              visibleHeadings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent)
            };
          });
          console.log('Page content:', pageContent);
        }
      }
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: 'e2e-tests/screenshots/debug-loop-final.png', fullPage: true });
  });

  test('Check if user is already registered', async ({ page }) => {
    // Make direct API call to check registration status
    const response = await page.request.post('http://localhost:8002/api/snaptrade/register', {
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
        'Content-Type': 'application/json'
      },
      data: {}
    });
    
    console.log('Direct register API status:', response.status());
    const data = await response.json();
    console.log('Direct register API response:', data);
    
    // Check accounts directly
    const accountsResponse = await page.request.get('http://localhost:8002/api/snaptrade/accounts', {
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
      }
    });
    
    console.log('Direct accounts API status:', accountsResponse.status());
    const accountsData = await accountsResponse.json();
    console.log('Direct accounts API response:', accountsData);
  });
});