import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'full-validation');

// Test user credentials
const TEST_USER = {
  email: `test_${Date.now()}@aims.com`,
  password: 'TestPassword123!',
  existingEmail: 'test@aims.com',
  existingPassword: 'password123'
};

test.describe('AIMS Full Application Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // Clear localStorage to ensure clean state
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Authentication Flow', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access the dashboard directly
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Should be redirected to login
      await expect(page).toHaveURL(`${BASE_URL}/login`);
      await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-01-login-redirect.png'),
        fullPage: true 
      });
    });

    test('should allow user registration', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Click "Sign up" to switch to registration
      await page.click('button:has-text("Sign up")');
      await expect(page.locator('h1:has-text("Create account")')).toBeVisible();

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-02-signup-form.png'),
        fullPage: true 
      });

      // Fill in registration form
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder="Confirm your password"]', TEST_USER.password);
      
      // Check terms checkbox
      await page.check('input[type="checkbox"]');

      // Submit registration
      await page.click('button:has-text("Create account")');

      // Wait for registration to complete
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to home after successful registration
      await expect(page.locator('h1:has-text("AIMS")')).toBeVisible({ timeout: 10000 });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-03-registration-success.png'),
        fullPage: true 
      });
    });

    test('should allow user login with existing credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Fill in login form
      await page.fill('input[type="email"]', TEST_USER.existingEmail);
      await page.fill('input[type="password"]', TEST_USER.existingPassword);

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-04-login-form-filled.png'),
        fullPage: true 
      });

      // Submit login
      await page.click('button:has-text("Sign in")');

      // Wait for login to complete
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to home after successful login
      await expect(page.locator('h1:has-text("AIMS")')).toBeVisible({ timeout: 10000 });
      
      // Verify JWT token is stored
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeTruthy();

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-05-login-success.png'),
        fullPage: true 
      });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Fill in invalid credentials
      await page.fill('input[type="email"]', 'invalid@email.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit login
      await page.click('button:has-text("Sign in")');

      // Should show error message
      await expect(page.locator('text="Authentication failed"')).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-06-login-error.png'),
        fullPage: true 
      });
    });
  });

  test.describe('Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each dashboard test
      await loginUser(page, TEST_USER.existingEmail, TEST_USER.existingPassword);
    });

    test('should navigate to all main sections', async ({ page }) => {
      // Home page should have navigation cards
      await expect(page.locator('h1:has-text("AIMS")')).toBeVisible();
      
      const sections = [
        { name: 'Dashboard', expectedText: 'AIMS Dashboard' },
        { name: 'Morning Brief', expectedText: 'Morning Brief' },
        { name: 'Income Tracker', expectedText: 'Income Goal Tracker' },
        { name: 'Tasks', expectedText: 'Weekly Tasks' },
        { name: 'Trade Ticket', expectedText: 'Trade Ticket' }
      ];

      for (const section of sections) {
        // Click on section
        await page.click(`button:has-text("${section.name}")`);
        await page.waitForLoadState('networkidle');

        // Verify we're on the right page
        await expect(page.locator(`text="${section.expectedText}"`).first()).toBeVisible({ timeout: 10000 });
        
        await page.screenshot({ 
          path: path.join(SCREENSHOTS_DIR, `nav-${section.name.toLowerCase().replace(' ', '-')}.png`),
          fullPage: true 
        });

        // Go back home
        await page.click('button:has-text("← Home")');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display portfolio data in dashboard', async ({ page }) => {
      // Navigate to dashboard
      await page.click('button:has-text("Dashboard")');
      await page.waitForLoadState('networkidle');

      // Check for SnapTrade widget
      await expect(page.locator('text="SnapTrade Connection"')).toBeVisible({ timeout: 10000 });
      
      // Check for portfolio overview
      await expect(page.locator('text="Total Portfolio Value"')).toBeVisible();
      
      // Check for performance metrics
      await expect(page.locator('text="Daily"')).toBeVisible();
      await expect(page.locator('text="Weekly"')).toBeVisible();
      await expect(page.locator('text="Monthly"')).toBeVisible();
      await expect(page.locator('text="YTD"')).toBeVisible();

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'dashboard-01-overview.png'),
        fullPage: true 
      });

      // If no accounts connected, should show connection prompt
      const noAccountsText = await page.locator('text="No accounts connected"').count();
      if (noAccountsText > 0) {
        await expect(page.locator('button:has-text("Connect Account")')).toBeVisible();
      }
    });
  });

  test.describe('SnapTrade Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each SnapTrade test
      await loginUser(page, TEST_USER.existingEmail, TEST_USER.existingPassword);
    });

    test('should navigate to SnapTrade connection from home', async ({ page }) => {
      // Click on Connect Brokerage
      await page.click('button:has-text("Connect Brokerage")');
      await page.waitForLoadState('networkidle');

      // Should see SnapTrade registration page
      await expect(page.locator('h1:has-text("Connect Your Brokerage Account")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text="Why Connect with SnapTrade?"')).toBeVisible();

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'snaptrade-01-registration.png'),
        fullPage: true 
      });
    });

    test('should show connection status in dashboard', async ({ page }) => {
      // Navigate to dashboard
      await page.click('button:has-text("Dashboard")');
      await page.waitForLoadState('networkidle');

      // Check SnapTrade widget status
      const widgetTexts = [
        'SnapTrade Connection',
        'Brokerage account integration'
      ];

      for (const text of widgetTexts) {
        await expect(page.locator(`text="${text}"`)).toBeVisible();
      }

      // Check for manage button
      await expect(page.locator('button:has-text("Manage")')).toBeVisible();

      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'snaptrade-02-widget-status.png'),
        fullPage: true 
      });
    });
  });

  test.describe('Protected Routes', () => {
    test('should protect all application routes', async ({ page }) => {
      // Ensure we're logged out
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.clear());

      const protectedRoutes = [
        '/',
        '/dashboard',
        '/morning-brief',
        '/tasks',
        '/trade-ticket'
      ];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');

        // Should redirect to login
        await expect(page).toHaveURL(`${BASE_URL}/login`);
        await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
      }
    });
  });

  test.describe('API Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Login before API tests
      await loginUser(page, TEST_USER.existingEmail, TEST_USER.existingPassword);
    });

    test('should make authenticated API calls', async ({ page }) => {
      // Set up request interception
      const apiCalls: string[] = [];
      
      page.on('request', request => {
        if (request.url().startsWith(API_URL)) {
          apiCalls.push(request.url());
          
          // Check for Authorization header
          const headers = request.headers();
          expect(headers['authorization']).toMatch(/^Bearer /);
        }
      });

      // Navigate to dashboard (should trigger API calls)
      await page.click('button:has-text("Dashboard")');
      await page.waitForLoadState('networkidle');

      // Verify API calls were made
      expect(apiCalls.length).toBeGreaterThan(0);
      console.log('API calls made:', apiCalls);
    });
  });

  test.describe('Logout Functionality', () => {
    test('should successfully logout user', async ({ page }) => {
      // Login first
      await loginUser(page, TEST_USER.existingEmail, TEST_USER.existingPassword);
      
      // Verify we're logged in
      await expect(page.locator('h1:has-text("AIMS")')).toBeVisible();

      // Look for logout button (may be in a menu or header)
      // This might need adjustment based on actual UI
      const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('button:has-text("Sign out")'));
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForLoadState('networkidle');

        // Should be redirected to login
        await expect(page).toHaveURL(`${BASE_URL}/login`);
        
        // Token should be removed
        const token = await page.evaluate(() => localStorage.getItem('auth_token'));
        expect(token).toBeNull();
      }
    });
  });
});

// Helper function to login
async function loginUser(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  
  // Wait for redirect to home
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}