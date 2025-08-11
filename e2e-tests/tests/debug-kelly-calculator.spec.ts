import { test, expect } from '@playwright/test';

/**
 * Debug test for Kelly criterion calculation
 */

test.describe('Kelly Calculator Debug', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('http://localhost:3002');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Handle authentication if needed
    const welcomeText = await page.locator('text=Welcome back').count();
    if (welcomeText > 0) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'testpassword');
      await page.click('button:has-text("Sign in")');
      await page.waitForTimeout(3000);
    }
  });

  test('debug Kelly criterion validation and calculation', async ({ page }) => {
    // Navigate to Trade Ticket and open calculator
    await page.click('text=Trade Ticket');
    await page.waitForSelector('button:has-text("Calculate")', { timeout: 5000 });
    await page.click('button:has-text("Calculate")');
    await page.waitForSelector('text=Position Size Calculator', { timeout: 5000 });
    
    // Select Kelly Criterion method
    console.log('Selecting Kelly Criterion method...');
    await page.click('text=Kelly Criterion');
    await page.waitForTimeout(500);
    
    // Check what form fields are visible
    const accountInput = page.locator('input[placeholder="100000"]');
    const winRateInput = page.locator('input[placeholder="60"]');
    const winLossInput = page.locator('input[placeholder="2.0"]');
    const confidenceInput = page.locator('input[placeholder="1.0"]');
    
    console.log('Account input visible:', await accountInput.count());
    console.log('Win rate input visible:', await winRateInput.count());
    console.log('Win/loss input visible:', await winLossInput.count()); 
    console.log('Confidence input visible:', await confidenceInput.count());
    
    // Fill form step by step with debugging
    console.log('Filling account value...');
    await accountInput.fill('100000');
    console.log('Account value:', await accountInput.inputValue());
    
    console.log('Filling win rate...');
    await winRateInput.fill('60');
    console.log('Win rate value:', await winRateInput.inputValue());
    
    console.log('Filling win/loss ratio...');
    await winLossInput.fill('2.0');
    console.log('Win/loss value:', await winLossInput.inputValue());
    
    console.log('Filling confidence level...');
    await confidenceInput.fill('0.5');
    console.log('Confidence value:', await confidenceInput.inputValue());
    
    // Wait for validation and calculation
    console.log('Waiting for calculation...');
    await page.waitForTimeout(1000);
    
    // Check for validation errors
    const validationErrors = await page.locator('.text-red-600').count();
    console.log('Validation errors count:', validationErrors);
    
    if (validationErrors > 0) {
      const errorTexts = await page.locator('.text-red-600').allTextContents();
      console.log('Error messages:', errorTexts);
    }
    
    // Check right panel content
    const rightPanel = page.locator('.space-y-6').nth(1);
    const panelContent = await rightPanel.textContent();
    console.log('Right panel content:', panelContent);
    
    // Check for specific result elements
    const hasKellyPercentage = await page.locator('text=Kelly Percentage').count();
    const hasPositionSize = await page.locator('text=shares').count();
    const hasCalculationResult = await page.locator('text=Calculation Results').count();
    
    console.log('Kelly Percentage found:', hasKellyPercentage > 0);
    console.log('Position size found:', hasPositionSize > 0);
    console.log('Calculation Results found:', hasCalculationResult > 0);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-kelly-calculation.png' });
    
    // Try waiting longer
    console.log('Waiting longer for calculation...');
    await page.waitForTimeout(3000);
    
    // Check again
    const finalPanelContent = await rightPanel.textContent();
    console.log('Final panel content:', finalPanelContent);
    
    const finalKellyCount = await page.locator('text=Kelly Percentage').count();
    console.log('Final Kelly Percentage count:', finalKellyCount);
  });
});