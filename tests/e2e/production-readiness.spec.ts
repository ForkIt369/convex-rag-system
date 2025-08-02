import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://convex-rag-system.vercel.app';

test.describe('Production Readiness Tests', () => {
  test.setTimeout(60000); // Increase timeout for production tests

  test('Full RAG Pipeline Test', async ({ page }) => {
    // Setup console monitoring
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Test 1: Application loads without errors
    console.log('Testing application load...');
    await page.goto(PRODUCTION_URL);
    await expect(page).toHaveTitle(/RAG System/);
    expect(consoleErrors).toHaveLength(0);

    // Test 2: All tabs are accessible
    console.log('Testing navigation tabs...');
    const tabs = ['Documents', 'Memories', 'Pipeline', 'Search'];
    for (const tab of tabs) {
      await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
      await page.waitForTimeout(500);
      
      // Check for loading or error states
      const errorCount = await page.locator('text=/Error|Failed|Could not/i').count();
      expect(errorCount).toBe(0);
    }

    // Test 3: Document Upload Capability
    console.log('Testing document upload UI...');
    await page.getByRole('button', { name: /Documents/i }).click();
    const uploadArea = await page.locator('text=/Drop files here/i');
    await expect(uploadArea).toBeVisible();

    // Test 4: Memory Creation UI
    console.log('Testing memory creation...');
    await page.getByRole('button', { name: /Memories/i }).click();
    
    // Check for memory type selector
    const memoryTypeExists = await page.locator('select').count() > 0 || 
                             await page.locator('button:has-text("Episodic")').count() > 0;
    expect(memoryTypeExists).toBeTruthy();

    // Test 5: Search Functionality
    console.log('Testing search UI...');
    await page.getByRole('button', { name: /Search/i }).click();
    
    // Look for search input
    const searchInput = await page.locator('input[type="text"], input[type="search"], textarea').first();
    await expect(searchInput).toBeVisible();

    // Test 6: Pipeline Visualization
    console.log('Testing pipeline visualization...');
    await page.getByRole('button', { name: /Pipeline/i }).click();
    await page.waitForTimeout(1000);
    
    // Should show some pipeline content
    const pipelineContent = await page.locator('text=/RAG|Pipeline|Flow/i').count();
    expect(pipelineContent).toBeGreaterThan(0);

    // Final check: No critical errors
    expect(consoleErrors.filter(err => 
      err.includes('CONVEX') || 
      err.includes('Failed to fetch') ||
      err.includes('NetworkError')
    )).toHaveLength(0);

    console.log('✅ Core functionality test passed');
  });

  test('API Connectivity Test', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Monitor network requests
    const apiRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('convex.cloud') || url.includes('/api/')) {
        apiRequests.push(url);
      }
    });

    // Navigate through tabs to trigger API calls
    await page.getByRole('button', { name: /Memories/i }).click();
    await page.waitForTimeout(2000);

    // Should have made Convex API calls
    const convexCalls = apiRequests.filter(url => url.includes('convex'));
    expect(convexCalls.length).toBeGreaterThan(0);

    console.log('✅ API connectivity test passed');
  });

  test('Performance Metrics', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Check for memory leaks by navigating multiple times
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Documents/i }).click();
      await page.getByRole('button', { name: /Memories/i }).click();
      await page.getByRole('button', { name: /Search/i }).click();
    }

    // Should still be responsive
    const responseStart = Date.now();
    await page.getByRole('button', { name: /Pipeline/i }).click();
    const responseTime = Date.now() - responseStart;

    console.log(`Tab switch response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

    console.log('✅ Performance test passed');
  });

  test('Error Handling Test', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Test 404 handling
    const response = await page.goto(`${PRODUCTION_URL}/nonexistent-page`);
    expect(response?.status()).toBeLessThan(500); // Should not crash

    // Go back to home
    await page.goto(PRODUCTION_URL);
    
    // Check if app recovers
    await expect(page.getByRole('navigation')).toBeVisible();

    console.log('✅ Error handling test passed');
  });

  test('Security Headers Test', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);
    const headers = response?.headers() || {};

    // Check security headers
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy();

    // Check that sensitive data is not exposed
    const pageContent = await page.content();
    expect(pageContent).not.toContain('VOYAGE_API_KEY');
    expect(pageContent).not.toContain('pa-RfvrJdf06ytErdI3Zsc'); // API key fragment

    console.log('✅ Security test passed');
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PRODUCTION_URL);

    // Navigation should still work
    const navButton = page.getByRole('button').first();
    await expect(navButton).toBeVisible();

    // Content should be readable
    const mainContent = page.locator('main');
    const box = await mainContent.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);

    console.log('✅ Mobile responsiveness test passed');
  });
});