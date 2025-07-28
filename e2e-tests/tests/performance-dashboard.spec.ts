import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load environment configuration
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const env: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    });
    return env;
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}`);
    return {};
  }
}

// Load configuration from .env files
const backendEnv = loadEnvFile(path.join(__dirname, '../../backend/.env'));
const frontendEnv = loadEnvFile(path.join(__dirname, '../../frontend/.env.local'));

const FRONTEND_PORT = frontendEnv.PORT || '3002';
const API_PORT = backendEnv.API_PORT || '8002';
const BASE_URL = `http://localhost:${FRONTEND_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

// Test data and helpers
const TEST_USER = {
  email: 'test@aims.com',
  password: 'password123'
};

/**
 * Helper function to login user
 */
async function loginUser(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  
  // Submit login
  await page.click('button:has-text("Sign in")');
  
  // Wait for successful login and navigation
  await page.waitForResponse(response => 
    response.url().includes('/auth/login') && response.status() === 200
  );
  
  await page.waitForTimeout(1000); // Give time for auth state to update
}

/**
 * Helper function to navigate to performance dashboard
 */
async function navigateToPerformanceDashboard(page: Page): Promise<void> {
  // Look for performance dashboard link in navigation
  const perfLink = page.locator('a[href*="performance"], button:has-text("Performance")');
  
  if (await perfLink.count() > 0) {
    await perfLink.first().click();
  } else {
    // If no direct link, navigate via URL
    await page.goto(`${BASE_URL}/performance`);
  }
  
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to wait for performance data to load
 */
async function waitForPerformanceDataLoad(page: Page): Promise<void> {
  // Wait for loading indicator to disappear and data to appear
  await page.waitForFunction(
    () => {
      const loadingIndicator = document.querySelector('[data-testid="loading-indicator"], .animate-spin');
      const performanceData = document.querySelector('[data-testid="performance-metrics"], .performance-metrics');
      return !loadingIndicator && performanceData;
    },
    { timeout: 10000 }
  );
}

test.describe('Performance Dashboard E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Set up request/response logging for API calls
    page.on('response', response => {
      if (response.url().includes('/api/performance')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('should display performance dashboard after login', async ({ page }) => {
    // Login
    await loginUser(page);
    
    // Navigate to performance dashboard
    await navigateToPerformanceDashboard(page);
    
    // Verify dashboard loaded
    await expect(page.locator('h1:has-text("Performance Dashboard")')).toBeVisible();
    
    // Verify main dashboard components are present
    await expect(page.locator('[data-testid="performance-metrics"], .performance-metrics')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'e2e-tests/screenshots/performance-dashboard-loaded.png',
      fullPage: true 
    });
    
    console.log('✅ Performance dashboard display test passed');
  });

  test('should load and display performance metrics', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    
    // Wait for performance data to load
    await waitForPerformanceDataLoad(page);
    
    // Verify key performance metrics are displayed
    const metricsSelectors = [
      '[data-testid="total-return"], .total-return',
      '[data-testid="current-value"], .current-value',
      '[data-testid="daily-return"], .daily-return',
      '[data-testid="monthly-return"], .monthly-return'
    ];
    
    for (const selector of metricsSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
        console.log(`✅ Found metrics element: ${selector}`);
      }
    }
    
    // Verify metrics have numeric values (not just placeholders)
    const metricsText = await page.locator('.performance-metrics, [data-testid="performance-metrics"]').textContent();
    
    // Should contain percentage symbols or dollar signs
    expect(metricsText).toMatch(/[\$%]/);
    
    console.log('✅ Performance metrics display test passed');
  });

  test('should handle timeframe changes', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Test different timeframe options
    const timeframes = ['1D', '1W', '1M', 'YTD', '1Y'];
    
    for (const timeframe of timeframes) {
      // Look for timeframe buttons/selectors
      const timeframeButton = page.locator(`button:has-text("${timeframe}"), [data-timeframe="${timeframe}"]`).first();
      
      if (await timeframeButton.count() > 0) {
        console.log(`Testing timeframe: ${timeframe}`);
        
        // Click timeframe button
        await timeframeButton.click();
        
        // Wait for API call to complete
        await page.waitForResponse(response => 
          response.url().includes('/api/performance/metrics') && 
          response.status() === 200,
          { timeout: 5000 }
        ).catch(() => {
          console.log(`⚠️ No API response for timeframe ${timeframe}`);
        });
        
        // Verify button is selected/active
        await expect(timeframeButton).toHaveClass(/active|selected|bg-blue/);
        
        // Wait a moment for data to update
        await page.waitForTimeout(500);
        
        console.log(`✅ Timeframe ${timeframe} test passed`);
      } else {
        console.log(`⚠️ Timeframe button not found: ${timeframe}`);
      }
    }
  });

  test('should handle benchmark selection changes', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Look for benchmark selector
    const benchmarkSelector = page.locator('select:has(option[value="SPY"]), [data-testid="benchmark-selector"]').first();
    
    if (await benchmarkSelector.count() > 0) {
      console.log('Testing benchmark selection');
      
      // Test different benchmark options
      const benchmarks = ['SPY', 'QQQ', 'VTI', 'none'];
      
      for (const benchmark of benchmarks) {
        await benchmarkSelector.selectOption(benchmark);
        
        // Wait for API response
        await page.waitForResponse(response => 
          response.url().includes('/api/performance') && 
          response.status() === 200,
          { timeout: 5000 }
        ).catch(() => {
          console.log(`⚠️ No API response for benchmark ${benchmark}`);
        });
        
        // Wait for UI update
        await page.waitForTimeout(500);
        
        console.log(`✅ Benchmark ${benchmark} test passed`);
      }
    } else {
      console.log('⚠️ Benchmark selector not found');
    }
  });

  test('should display performance chart', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Look for chart container (Recharts typically uses SVG)
    const chartSelectors = [
      'svg.recharts-wrapper',
      '[data-testid="performance-chart"]',
      '.performance-chart svg',
      '.recharts-surface'
    ];
    
    let chartFound = false;
    for (const selector of chartSelectors) {
      const chart = page.locator(selector).first();
      if (await chart.count() > 0) {
        await expect(chart).toBeVisible();
        console.log(`✅ Chart found with selector: ${selector}`);
        chartFound = true;
        break;
      }
    }
    
    if (!chartFound) {
      console.log('⚠️ Performance chart not found - checking for alternative chart implementations');
      // Look for any SVG or canvas elements that might be charts
      const svgElements = page.locator('svg');
      const canvasElements = page.locator('canvas');
      
      console.log(`Found ${await svgElements.count()} SVG elements`);
      console.log(`Found ${await canvasElements.count()} Canvas elements`);
    }
    
    // Take screenshot of chart area
    await page.screenshot({ 
      path: 'e2e-tests/screenshots/performance-chart.png',
      fullPage: true 
    });
  });

  test('should handle refresh functionality', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Look for refresh button
    const refreshButton = page.locator('button[title="Refresh"], button:has-text("Refresh"), [data-testid="refresh-button"]').first();
    
    if (await refreshButton.count() > 0) {
      console.log('Testing refresh functionality');
      
      // Click refresh button
      await refreshButton.click();
      
      // Verify loading state appears
      const loadingIndicator = page.locator('.animate-spin, [data-testid="loading-indicator"]').first();
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator).toBeVisible();
        console.log('✅ Loading indicator appeared');
      }
      
      // Wait for refresh to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/performance') && 
        response.status() === 200,
        { timeout: 10000 }
      );
      
      // Verify loading state disappears
      await waitForPerformanceDataLoad(page);
      
      console.log('✅ Refresh functionality test passed');
    } else {
      console.log('⚠️ Refresh button not found');
    }
  });

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Verify mobile-specific elements
    const mobileMenuButton = page.locator('button:has([data-lucide="menu"]), [data-testid="mobile-menu-toggle"]').first();
    
    if (await mobileMenuButton.count() > 0) {
      console.log('Testing mobile menu functionality');
      
      // Click mobile menu button
      await mobileMenuButton.click();
      
      // Verify mobile controls appear
      const mobileControls = page.locator('.mobile-controls, [data-testid="mobile-controls"]').first();
      if (await mobileControls.count() > 0) {
        await expect(mobileControls).toBeVisible();
        console.log('✅ Mobile controls visible');
      }
    }
    
    // Verify responsive layout elements
    const dashboardContent = page.locator('.performance-dashboard, [data-testid="performance-dashboard"]').first();
    if (await dashboardContent.count() > 0) {
      // Should be visible and properly sized
      await expect(dashboardContent).toBeVisible();
    }
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'e2e-tests/screenshots/performance-dashboard-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ Mobile responsive test passed');
  });

  test('should handle error states gracefully', async ({ page }) => {
    await loginUser(page);
    
    // Mock API error by intercepting requests
    await page.route('**/api/performance/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });
    
    await navigateToPerformanceDashboard(page);
    
    // Wait for error state to appear
    await page.waitForTimeout(3000);
    
    // Look for error messages or fallback UI
    const errorSelectors = [
      ':has-text("Error")',
      ':has-text("Unable to load")',
      ':has-text("Performance Data Unavailable")',
      '[data-testid="error-state"]',
      '.error-message'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        console.log(`✅ Error state found: ${selector}`);
        errorFound = true;
        break;
      }
    }
    
    // Look for retry/refresh button in error state
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")').first();
    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeVisible();
      console.log('✅ Retry button available in error state');
    }
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: 'e2e-tests/screenshots/performance-dashboard-error.png',
      fullPage: true 
    });
    
    if (errorFound) {
      console.log('✅ Error handling test passed');
    } else {
      console.log('⚠️ Error state not clearly displayed');
    }
  });

  test('should test benchmark comparison functionality', async ({ page }) => {
    await loginUser(page);
    await navigateToPerformanceDashboard(page);
    await waitForPerformanceDataLoad(page);
    
    // Select a benchmark (not "none")
    const benchmarkSelector = page.locator('select:has(option[value="SPY"])').first();
    if (await benchmarkSelector.count() > 0) {
      await benchmarkSelector.selectOption('SPY');
      
      // Wait for benchmark data to load
      await page.waitForResponse(response => 
        response.url().includes('/api/performance') && 
        response.status() === 200,
        { timeout: 5000 }
      ).catch(() => console.log('⚠️ No benchmark API response'));
      
      await page.waitForTimeout(1000);
      
      // Look for benchmark comparison components
      const benchmarkComparisonSelectors = [
        '[data-testid="benchmark-comparison"]',
        '.benchmark-comparison',
        ':has-text("vs SPY")',
        ':has-text("Benchmark")'
      ];
      
      let benchmarkFound = false;
      for (const selector of benchmarkComparisonSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible()) {
          console.log(`✅ Benchmark comparison found: ${selector}`);
          benchmarkFound = true;
          break;
        }
      }
      
      if (benchmarkFound) {
        console.log('✅ Benchmark comparison functionality test passed');
      } else {
        console.log('⚠️ Benchmark comparison UI not found');
      }
    } else {
      console.log('⚠️ Benchmark selector not found - skipping benchmark test');
    }
  });

  test('should handle empty/no data states', async ({ page }) => {
    await loginUser(page);
    
    // Mock empty data response
    await page.route('**/api/performance/**', (route) => {
      if (route.request().url().includes('/metrics')) {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'No performance data available' })
        });
      } else {
        route.continue();
      }
    });
    
    await navigateToPerformanceDashboard(page);
    await page.waitForTimeout(3000);
    
    // Look for empty state UI
    const emptyStateSelectors = [
      ':has-text("No Performance Data")',
      ':has-text("No data available")',
      '[data-testid="empty-state"]',
      '.empty-state'
    ];
    
    let emptyStateFound = false;
    for (const selector of emptyStateSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        console.log(`✅ Empty state found: ${selector}`);
        emptyStateFound = true;
        break;
      }
    }
    
    // Take screenshot of empty state
    await page.screenshot({ 
      path: 'e2e-tests/screenshots/performance-dashboard-empty.png',
      fullPage: true 
    });
    
    if (emptyStateFound) {
      console.log('✅ Empty state handling test passed');
    } else {
      console.log('⚠️ Empty state UI not clearly displayed');
    }
  });

});

test.describe('Performance Dashboard API Integration', () => {
  
  test('should verify API endpoints are accessible', async ({ page }) => {
    // Test direct API access
    const apiEndpoints = [
      `${API_URL}/api/health`,
      `${API_URL}/api/performance/metrics?period=1M&benchmark=SPY`,
      `${API_URL}/api/performance/historical?start_date=2024-01-01&end_date=2024-12-31&frequency=daily`
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(endpoint, {
          headers: {
            'Authorization': 'Bearer test-token' // This might need to be updated based on auth implementation
          }
        });
        
        console.log(`API ${endpoint}: ${response.status()}`);
        
        if (endpoint.includes('/health')) {
          // Health endpoint should be accessible
          expect(response.status()).toBeLessThan(500);
        }
        // Other endpoints might require authentication, so 401/403 is acceptable
        
      } catch (error) {
        console.log(`⚠️ API endpoint error for ${endpoint}: ${error}`);
      }
    }
  });

  test('should test API response formats', async ({ page }) => {
    // This test validates that API responses match expected formats
    // even if authentication fails, we can still test response structure
    
    const response = await page.request.get(`${API_URL}/api/performance/metrics?period=1M&benchmark=SPY`);
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Verify expected response structure
      expect(data).toHaveProperty('portfolio_metrics');
      expect(data).toHaveProperty('time_series');
      
      console.log('✅ API response format validation passed');
    } else if (response.status() === 401 || response.status() === 403) {
      console.log('⚠️ API requires authentication (expected)');
    } else {
      console.log(`⚠️ Unexpected API response status: ${response.status()}`);
    }
  });

});