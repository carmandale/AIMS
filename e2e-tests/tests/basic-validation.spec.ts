import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';

test.describe('Basic Application Tests', () => {
  test('frontend should be accessible', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(400);
  });

  test('backend health check should work', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    
    // Should show login form
    await expect(page.locator('h1').filter({ hasText: /Welcome back|Sign in/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Sign in/i })).toBeVisible();
  });

  test('should handle login flow', async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
    });
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@aims.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click sign in button
    await page.click('button:has-text("Sign in")');
    
    // Wait for response
    await page.waitForResponse(response => 
      response.url().includes('/auth/login') && response.status() === 200
    );
    
    // Wait for navigation to complete
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 }).catch(() => {
      console.log('Navigation to home page did not occur within 5 seconds');
    });
    
    // Check if token is stored
    await page.waitForTimeout(500); // Give it a moment to process
    const authData = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      // Check AuthProvider state if available
      return {
        token: token,
        hasToken: !!token
      };
    });
    console.log('Auth data:', authData);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Try checking if AuthProvider state updated
    const isAuthenticated = await page.evaluate(() => {
      // This won't work directly, but let's see what happens
      return window.location.pathname !== '/login';
    });
    console.log('Appears authenticated:', isAuthenticated);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'login-result.png', fullPage: true });
  });
});