import { test, expect } from '@playwright/test';

test.describe('Convex Functions Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
    await page.goto('https://convex-rag-system.vercel.app');
  });

  test('should load vector memories without Convex errors', async ({ page }) => {
    // Go to Memories tab
    await page.getByRole('button', { name: /Memories/i }).click();
    
    // Wait for any potential Convex errors
    await page.waitForTimeout(2000);
    
    // Check for the specific error mentioned: "Could not find public function for 'functions/vectorSearch:listVectorMemories'"
    const errorCount = await page.locator('text=/Could not find public function|CONVEX|Error:/i').count();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'convex-memories-test.png', fullPage: true });
    
    expect(errorCount).toBe(0);
  });

  test('should test vector search functionality', async ({ page }) => {
    // Go to Search tab
    await page.getByRole('button', { name: /Search/i }).click();
    
    // Wait for the search interface to load
    await page.waitForTimeout(1000);
    
    // Check for any Convex errors
    const errorCount = await page.locator('text=/Could not find public function|CONVEX|Error:/i').count();
    
    // Take screenshot
    await page.screenshot({ path: 'convex-search-test.png', fullPage: true });
    
    expect(errorCount).toBe(0);
  });

  test('should check all tabs for Convex function errors', async ({ page }) => {
    const tabs = ['Documents', 'Memories', 'Pipeline', 'Search'];
    const errors: string[] = [];
    
    for (const tab of tabs) {
      console.log(`Testing ${tab} tab...`);
      
      // Click on tab
      await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
      await page.waitForTimeout(1500);
      
      // Check for Convex errors
      const errorElements = await page.locator('text=/Could not find public function|CONVEX Q\\(functions|Error:/i').all();
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text) {
          errors.push(`${tab} tab: ${text}`);
        }
      }
      
      // Take screenshot of each tab
      await page.screenshot({ path: `convex-${tab.toLowerCase()}-tab.png`, fullPage: true });
    }
    
    // Log all errors found
    if (errors.length > 0) {
      console.log('Convex errors found:');
      errors.forEach(err => console.log('  -', err));
    }
    
    expect(errors).toHaveLength(0);
  });

  test('should verify listVectorMemories function exists', async ({ page }) => {
    // Go directly to memories tab which uses listVectorMemories
    await page.goto('https://convex-rag-system.vercel.app');
    await page.getByRole('button', { name: /Memories/i }).click();
    
    // Wait for potential loading
    await page.waitForTimeout(2000);
    
    // Check specifically for the error the user reported
    const specificError = await page.locator('text="Could not find public function for \'functions/vectorSearch:listVectorMemories\'"').count();
    
    if (specificError > 0) {
      console.log('Found the specific error reported by user!');
      await page.screenshot({ path: 'vector-memories-error.png', fullPage: true });
    }
    
    expect(specificError).toBe(0);
  });
});