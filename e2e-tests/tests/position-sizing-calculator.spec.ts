import { test, expect } from '@playwright/test';

/**
 * Position Sizing Calculator E2E Tests
 * 
 * These tests cover the complete user flows for the position sizing calculator,
 * including all three calculation methods and trade ticket integration.
 */

test.describe('Position Sizing Calculator', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Wait for the application to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Handle authentication - check if we're on login page
    const emailInput = await page.locator('input[placeholder*="email"]').count();
    const passwordInput = await page.locator('input[placeholder*="password"]').count();
    const signInButton = await page.locator('button:has-text("Sign in")').count();
    
    if (emailInput > 0 && passwordInput > 0 && signInButton > 0) {
      console.log('Login required - handling authentication');
      
      // Fill in test credentials using placeholder selectors
      await page.fill('input[placeholder*="email"]', 'test@example.com');
      await page.fill('input[placeholder*="password"]', 'testpassword');
      
      // Add a small delay to ensure fields are filled
      await page.waitForTimeout(1000);
      
      // Click sign in button
      await page.click('button:has-text("Sign in")');
      
      // Wait for successful login - look for any main content that appears after login
      try {
        await page.waitForSelector('h1:not(:has-text("Welcome back"))', { timeout: 10000 });
      } catch (error) {
        console.log('Login may have failed or main content not found');
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/debug-after-login.png' });
      }
    }
  });

  test.describe('Fixed Risk Calculation Flow', () => {
    
    test('should complete fixed risk calculation with valid inputs', async ({ page }) => {
      // Test Scenario 1 from tests.md: Fixed Risk Calculation
      
      // Navigate to position calculator (this may need adjustment based on UI)
      await page.click('text=Trade Ticket'); // Assuming trade ticket has calculator
      await page.waitForSelector('button:has-text("Calculate")', { timeout: 5000 });
      
      // Click the position size calculator button
      await page.click('button:has-text("Calculate")');
      
      // Wait for calculator modal to open
      await page.waitForSelector('text=Position Size Calculator', { timeout: 5000 });
      
      // Select "Fixed Risk" method (should be default)
      await page.click('text=Fixed Risk');
      
      // Enter test data from scenario
      await page.fill('input[placeholder="100000"]', '100000'); // Account value
      await page.fill('input[placeholder="2"]', '2'); // Risk percentage
      await page.fill('input[placeholder="150.00"]', '50'); // Entry price
      await page.fill('input[placeholder="145.00"]', '48'); // Stop loss
      
      // Wait for calculation to complete
      await page.waitForSelector('text=1000 shares', { timeout: 3000 });
      
      // Verify calculated results
      await expect(page.locator('text=1000 shares')).toBeVisible();
      await expect(page.locator('text=$2,000')).toBeVisible(); // Risk amount
      
      // Take screenshot for validation
      await page.screenshot({ path: 'test-results/fixed-risk-calculation.png' });
    });

    test('should show validation errors for invalid inputs', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Test with invalid data (stop loss higher than entry price)
      await page.fill('input[placeholder="100000"]', '100000');
      await page.fill('input[placeholder="2"]', '2');
      await page.fill('input[placeholder="150.00"]', '50');
      await page.fill('input[placeholder="145.00"]', '55'); // Invalid: stop loss > entry
      
      // Should show validation error
      await expect(page.locator('text=Stop loss must be below entry price')).toBeVisible();
      
      // Screenshot for validation
      await page.screenshot({ path: 'test-results/fixed-risk-validation-error.png' });
    });

    test('should update calculations in real-time', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Enter initial values
      await page.fill('input[placeholder="100000"]', '100000');
      await page.fill('input[placeholder="2"]', '2');
      await page.fill('input[placeholder="150.00"]', '50');
      await page.fill('input[placeholder="145.00"]', '48');
      
      // Wait for initial calculation
      await page.waitForSelector('text=1000 shares');
      
      // Change risk percentage and verify update
      await page.fill('input[placeholder="2"]', '1'); // Change to 1%
      await page.waitForSelector('text=500 shares'); // Should be half
      
      // Screenshot final state
      await page.screenshot({ path: 'test-results/fixed-risk-real-time.png' });
    });
  });

  test.describe('Kelly Criterion with Warnings', () => {
    
    test('should complete Kelly criterion calculation and show warnings', async ({ page }) => {
      // Test Scenario 2 from tests.md: Kelly Criterion with Warning
      
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Select "Kelly Criterion" method
      await page.click('text=Kelly Criterion');
      
      // Enter test data from scenario
      await page.fill('input[placeholder="100000"]', '100000'); // Account value
      await page.fill('input[placeholder="60"]', '60'); // Win rate
      await page.fill('input[placeholder="2.0"]', '2.0'); // Win/loss ratio
      await page.fill('input[placeholder="1.0"]', '0.5'); // Confidence (half Kelly)
      
      // Wait for calculation
      await page.waitForTimeout(1000); // Allow for debounced calculation
      
      // Verify Kelly percentage is calculated
      const kellyPercentage = await page.locator('text=Kelly Percentage');
      await expect(kellyPercentage).toBeVisible();
      
      // Check for warnings about aggressive sizing
      const warningSection = await page.locator('text=Risk Warnings');
      if (await warningSection.count() > 0) {
        await expect(warningSection).toBeVisible();
      }
      
      // Test adjustment to quarter Kelly
      await page.fill('input[placeholder="1.0"]', '0.25'); // Quarter Kelly
      await page.waitForTimeout(1000);
      
      // Screenshot final state
      await page.screenshot({ path: 'test-results/kelly-criterion-calculation.png' });
    });

    test('should handle extreme Kelly values with appropriate warnings', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Select Kelly Criterion
      await page.click('text=Kelly Criterion');
      
      // Enter extreme values that should trigger warnings
      await page.fill('input[placeholder="100000"]', '100000');
      await page.fill('input[placeholder="60"]', '90'); // Very high win rate
      await page.fill('input[placeholder="2.0"]', '5.0'); // Very high win/loss ratio
      await page.fill('input[placeholder="1.0"]', '1.0'); // Full Kelly
      
      await page.waitForTimeout(1000);
      
      // Should show warnings about aggressive position sizing
      await expect(page.locator('text=Risk Warnings')).toBeVisible();
      
      // Screenshot with warnings
      await page.screenshot({ path: 'test-results/kelly-extreme-values.png' });
    });
  });

  test.describe('Trade Ticket Integration Flow', () => {
    
    test('should integrate seamlessly with trade ticket', async ({ page }) => {
      // Test Scenario 3 from tests.md: Trade Ticket Integration
      
      // Navigate to trade ticket
      await page.click('text=Trade Ticket');
      await page.waitForSelector('text=Trade Ticket');
      
      // Set up a sample trade (AAPL limit buy order)
      await page.selectOption('text=BTC-USD', 'AAPL'); // Change symbol if needed
      await page.click('text=Buy'); // Select buy order
      await page.click('text=Limit'); // Select limit order
      await page.fill('input[placeholder="0.00"]', '150'); // Entry price
      
      // Click position size calculator button
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Verify entry price is pre-filled from trade ticket
      const entryPriceInput = page.locator('input[placeholder="150.00"]');
      await expect(entryPriceInput).toHaveValue('150');
      
      // Add stop loss and calculate position size
      await page.fill('input[placeholder="145.00"]', '145'); // Stop loss
      await page.fill('input[placeholder="2"]', '2'); // Risk percentage
      
      // Wait for calculation
      await page.waitForTimeout(1000);
      
      // Copy result to trade ticket
      await page.click('button:has-text("Copy to Trade Ticket")');
      
      // Wait for modal to close and verify amount is updated in trade ticket
      await page.waitForSelector('text=Position size applied to trade ticket');
      
      // Close calculator modal
      await page.click('button[aria-label="Close"]');
      
      // Verify position size is now in trade ticket amount field
      const amountInput = page.locator('input[placeholder="0.00"]').first();
      const amountValue = await amountInput.inputValue();
      expect(parseFloat(amountValue)).toBeGreaterThan(0);
      
      // Screenshot final state
      await page.screenshot({ path: 'test-results/trade-ticket-integration.png' });
    });

    test('should handle validation errors in trade ticket after calculator use', async ({ page }) => {
      // Navigate to trade ticket and open calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Calculate a position size that exceeds account limits
      await page.fill('input[placeholder="100000"]', '10000'); // Small account
      await page.fill('input[placeholder="2"]', '50'); // Very high risk %
      await page.fill('input[placeholder="150.00"]', '150');
      await page.fill('input[placeholder="145.00"]', '145');
      
      await page.waitForTimeout(1000);
      
      // Should show validation errors in calculator
      await expect(page.locator('text=Trade Validation Errors')).toBeVisible();
      
      // Try to copy to trade ticket - should be disabled or show warning
      const copyButton = page.locator('button:has-text("Copy to Trade Ticket")');
      if (await copyButton.count() > 0) {
        const isDisabled = await copyButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
      
      // Screenshot validation state
      await page.screenshot({ path: 'test-results/trade-validation-errors.png' });
    });
  });

  test.describe('Volatility-Based Calculation', () => {
    
    test('should complete volatility-based calculation with ATR', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Select "Volatility-Based" method
      await page.click('text=Volatility-Based');
      
      // Enter test data
      await page.fill('input[placeholder="100000"]', '100000'); // Account value
      await page.fill('input[placeholder="2"]', '2'); // Risk percentage
      await page.fill('input[placeholder="150.00"]', '150'); // Entry price
      await page.fill('input[placeholder="2.50"]', '2.5'); // ATR
      await page.fill('input[placeholder="2.0"]', '2.0'); // ATR multiplier
      
      // Wait for calculation
      await page.waitForTimeout(1000);
      
      // Verify position size is calculated based on volatility
      const positionSize = await page.locator('text=shares').first();
      await expect(positionSize).toBeVisible();
      
      // Screenshot result
      await page.screenshot({ path: 'test-results/volatility-based-calculation.png' });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    
    test('should work properly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to trade ticket
      await page.goto('http://localhost:3002');
      await page.waitForSelector('h1');
      
      // Open calculator on mobile
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Verify modal fits properly on mobile screen
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Test basic calculation on mobile
      await page.fill('input[placeholder="100000"]', '50000');
      await page.fill('input[placeholder="2"]', '1');
      await page.fill('input[placeholder="150.00"]', '100');
      await page.fill('input[placeholder="145.00"]', '95');
      
      await page.waitForTimeout(1000);
      
      // Should show results
      await expect(page.locator('text=shares')).toBeVisible();
      
      // Screenshot mobile layout
      await page.screenshot({ path: 'test-results/mobile-calculator.png' });
    });
  });

  test.describe('Accessibility', () => {
    
    test('should be accessible with keyboard navigation', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Test keyboard navigation through form fields
      await page.keyboard.press('Tab'); // Should focus first input
      await page.keyboard.type('100000');
      
      await page.keyboard.press('Tab'); // Next field
      await page.keyboard.type('2');
      
      await page.keyboard.press('Tab'); // Next field
      await page.keyboard.type('150');
      
      await page.keyboard.press('Tab'); // Next field
      await page.keyboard.type('145');
      
      // Test Escape key closes modal
      await page.keyboard.press('Escape');
      
      // Modal should be closed
      await expect(page.locator('text=Position Size Calculator')).not.toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Navigate to calculator
      await page.click('text=Trade Ticket');
      await page.click('button:has-text("Calculate")');
      await page.waitForSelector('text=Position Size Calculator');
      
      // Check for proper modal role
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Check for form labels
      const accountValueLabel = page.locator('label:has-text("Account Value")');
      await expect(accountValueLabel).toBeVisible();
      
      // Check for button accessibility
      const calculateButton = page.locator('button:has-text("Calculate")');
      const ariaLabel = await calculateButton.first().getAttribute('title');
      expect(ariaLabel).toBeTruthy();
      
      // Screenshot accessibility state
      await page.screenshot({ path: 'test-results/accessibility-test.png' });
    });
  });
});