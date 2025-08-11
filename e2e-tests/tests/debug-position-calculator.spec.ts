import { test, expect } from '@playwright/test';

/**
 * Debug test for position sizing calculator form validation
 * This test investigates why the calculation doesn't trigger after form fill
 */

test.describe('Position Calculator Debug', () => {
  
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

  test('debug form validation and calculation trigger', async ({ page }) => {
    // Navigate to Trade Ticket and open calculator
    await page.click('text=Trade Ticket');
    await page.waitForSelector('button:has-text("Calculate")', { timeout: 5000 });
    await page.click('button:has-text("Calculate")');
    await page.waitForSelector('text=Position Size Calculator', { timeout: 5000 });
    
    // Add debugging: log initial state
    console.log('Calculator opened, checking initial state...');
    
    // Get all form inputs and their current values
    const accountInput = page.locator('input[placeholder="100000"]');
    const riskInput = page.locator('input[placeholder="2"]');
    const entryInput = page.locator('input[placeholder="150.00"]');
    const stopInput = page.locator('input[placeholder="145.00"]');
    
    // Log initial values
    console.log('Initial account value:', await accountInput.inputValue());
    console.log('Initial risk value:', await riskInput.inputValue());
    console.log('Initial entry value:', await entryInput.inputValue());
    console.log('Initial stop value:', await stopInput.inputValue());
    
    // Fill form step by step with debugging
    console.log('Filling account value...');
    await accountInput.fill('100000');
    await page.waitForTimeout(100);
    console.log('Account value after fill:', await accountInput.inputValue());
    
    console.log('Filling risk percentage...');
    await riskInput.fill('2');
    await page.waitForTimeout(100);
    console.log('Risk value after fill:', await riskInput.inputValue());
    
    console.log('Filling entry price...');
    await entryInput.fill('50');
    await page.waitForTimeout(100);
    console.log('Entry value after fill:', await entryInput.inputValue());
    
    console.log('Filling stop loss...');
    await stopInput.fill('48');
    await page.waitForTimeout(100);
    console.log('Stop value after fill:', await stopInput.inputValue());
    
    // Wait for debounced validation (500ms)
    console.log('Waiting for validation debounce...');
    await page.waitForTimeout(1000);
    
    // Check if any validation errors are visible
    const validationErrors = await page.locator('.text-red-600').count();
    console.log('Validation errors count:', validationErrors);
    
    if (validationErrors > 0) {
      const errorTexts = await page.locator('.text-red-600').allTextContents();
      console.log('Validation error messages:', errorTexts);
    }
    
    // Check the right panel state
    const rightPanel = page.locator('.space-y-6').nth(1); // Right column
    const panelText = await rightPanel.textContent();
    console.log('Right panel content:', panelText);
    
    // Check if loading state is showing
    const isCalculating = await page.locator('text=Calculating...').count();
    console.log('Is calculating:', isCalculating > 0);
    
    // Check if validation message is showing
    const validationMessage = await page.locator('text=Please fix validation errors').count();
    console.log('Validation message visible:', validationMessage > 0);
    
    // Check if placeholder message is showing
    const placeholderMessage = await page.locator('text=Enter parameters to calculate position size').count();
    console.log('Placeholder message visible:', placeholderMessage > 0);
    
    // Wait longer to see if calculation eventually triggers
    console.log('Waiting longer for calculation...');
    await page.waitForTimeout(3000);
    
    // Check again for results
    const hasResults = await page.locator('text=shares').count();
    console.log('Has results after wait:', hasResults > 0);
    
    // Try triggering calculation manually by focusing/blurring a field
    console.log('Trying to trigger calculation by field interaction...');
    await stopInput.focus();
    await stopInput.blur();
    await page.waitForTimeout(1000);
    
    const hasResultsAfterBlur = await page.locator('text=shares').count();
    console.log('Has results after blur:', hasResultsAfterBlur > 0);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-calculator-state.png' });
    
    // Try manually triggering input events
    console.log('Trying to trigger input events...');
    await riskInput.dispatchEvent('input');
    await page.waitForTimeout(500);
    
    const hasResultsAfterEvent = await page.locator('text=shares').count();
    console.log('Has results after dispatch event:', hasResultsAfterEvent > 0);
    
    // Check if the form data is being processed correctly
    // Look for any JavaScript errors in console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Final state check
    const finalPanelText = await rightPanel.textContent();
    console.log('Final right panel state:', finalPanelText);
  });
  
  test('debug with manual value entry approach', async ({ page }) => {
    // Navigate to calculator
    await page.click('text=Trade Ticket');
    await page.click('button:has-text("Calculate")');
    await page.waitForSelector('text=Position Size Calculator');
    
    // Try a different approach - clear and type character by character
    console.log('Testing manual character entry...');
    
    const accountInput = page.locator('input[placeholder="100000"]');
    await accountInput.click();
    await accountInput.clear();
    await page.keyboard.type('100000');
    
    const riskInput = page.locator('input[placeholder="2"]');
    await riskInput.click();
    await riskInput.clear();
    await page.keyboard.type('2');
    
    const entryInput = page.locator('input[placeholder="150.00"]');
    await entryInput.click();
    await entryInput.clear();
    await page.keyboard.type('50');
    
    const stopInput = page.locator('input[placeholder="145.00"]');
    await stopInput.click();
    await stopInput.clear();
    await page.keyboard.type('48');
    
    // Wait for calculation
    await page.waitForTimeout(1000);
    
    // Check for results
    const hasResults = await page.locator('text=shares').count();
    console.log('Has results with keyboard entry:', hasResults > 0);
    
    if (hasResults > 0) {
      const resultText = await page.locator('text=shares').first().textContent();
      console.log('Result found:', resultText);
    }
    
    await page.screenshot({ path: 'test-results/debug-manual-entry.png' });
  });
});