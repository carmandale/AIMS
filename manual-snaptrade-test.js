const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Manual SnapTrade Connection Test');
  console.log('=====================================\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('1️⃣ Navigating to http://localhost:3003...');
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    
    // Check if login is required
    if (await page.locator('text=Sign In').isVisible()) {
      console.log('2️⃣ Login required. Signing in...');
      
      // Click Sign In
      await page.click('text=Sign In');
      await page.waitForLoadState('networkidle');
      
      // Fill login form
      await page.fill('input[name="email"]', 'dale.carman@gmail.com');
      await page.fill('input[name="password"]', 'test123');
      await page.click('button:has-text("Sign In")');
      
      // Wait for redirect
      await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
      console.log('✅ Logged in successfully');
    }
    
    // Wait for the Connect SnapTrade button
    console.log('3️⃣ Looking for Connect SnapTrade button...');
    await page.waitForSelector('button:has-text("Connect SnapTrade")', { timeout: 10000 });
    
    // Click Connect SnapTrade
    console.log('4️⃣ Clicking Connect SnapTrade...');
    await page.click('button:has-text("Connect SnapTrade")');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check for success or error
    if (await page.locator('text=already registered').isVisible()) {
      console.log('✅ User already registered with SnapTrade');
      
      // Try to get connection URL
      console.log('5️⃣ Attempting to connect brokerage account...');
      
      // Look for Connect Account button or similar
      const connectButton = page.locator('button:has-text("Connect Account"), button:has-text("Connect Brokerage"), button:has-text("Link Account")').first();
      
      if (await connectButton.isVisible()) {
        await connectButton.click();
        await page.waitForTimeout(3000);
        
        // Check if connection URL opened
        const newPagePromise = page.context().waitForEvent('page');
        const hasNewPage = await Promise.race([
          newPagePromise.then(() => true),
          page.waitForTimeout(5000).then(() => false)
        ]);
        
        if (hasNewPage) {
          console.log('✅ SnapTrade connection URL opened successfully!');
          console.log('🎉 FIX VERIFIED - SnapTrade integration is working!');
        } else {
          console.log('⚠️ No new window opened. Checking for errors...');
          
          // Check for error messages
          const errorText = await page.locator('.text-red-500, .text-destructive, [role="alert"]').first().textContent().catch(() => null);
          if (errorText) {
            console.log(`❌ Error found: ${errorText}`);
          }
        }
      } else {
        console.log('ℹ️ No Connect Account button found. User may need to complete registration first.');
      }
    } else if (await page.locator('text=registered successfully').isVisible()) {
      console.log('✅ New user registered successfully with SnapTrade');
      console.log('🎉 FIX VERIFIED - SnapTrade integration is working!');
    } else {
      // Check for errors
      const errorText = await page.locator('.text-red-500, .text-destructive, [role="alert"]').first().textContent().catch(() => null);
      if (errorText) {
        console.log(`❌ Error: ${errorText}`);
      } else {
        console.log('⚠️ Unexpected state. Taking screenshot...');
        await page.screenshot({ path: 'snaptrade-test-result.png' });
      }
    }
    
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'snaptrade-final-state.png' });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'snaptrade-error-state.png' });
  }
  
  console.log('\n🔍 Browser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close and exit.');
  
  // Keep browser open
  await new Promise(() => {});
})();