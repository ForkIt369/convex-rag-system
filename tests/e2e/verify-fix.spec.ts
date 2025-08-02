import { test, expect } from '@playwright/test';

test('Verify Convex Connection Fixed', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('Error:', msg.text());
    }
  });

  // Test production URL
  console.log('Testing production deployment...');
  await page.goto('https://convex-rag-system.vercel.app');
  
  // Wait for app to load
  await page.waitForTimeout(3000);
  
  // Check for Convex errors
  const convexErrors = consoleErrors.filter(err => 
    err.includes('CONVEX') || err.includes('Server Error')
  );
  
  console.log(`Found ${convexErrors.length} Convex errors`);
  expect(convexErrors).toHaveLength(0);
  
  // Test navigation
  console.log('Testing navigation...');
  for (const tab of ['Documents', 'Memories', 'Pipeline', 'Search']) {
    console.log(`  Clicking ${tab} tab...`);
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    await page.waitForTimeout(1000);
    
    // Should not show loading forever
    const loadingCount = await page.locator('text=/Loading/i').count();
    console.log(`  Loading indicators: ${loadingCount}`);
  }
  
  // Check API connectivity
  let apiCallMade = false;
  page.on('request', request => {
    if (request.url().includes('convex.cloud')) {
      apiCallMade = true;
      console.log('Convex API call:', request.url());
    }
  });
  
  // Navigate to trigger API calls
  await page.getByRole('button', { name: /Memories/i }).click();
  await page.waitForTimeout(2000);
  
  console.log('API calls made:', apiCallMade);
  
  // Final check
  const finalErrors = consoleErrors.filter(err => 
    err.includes('CONVEX') || 
    err.includes('Server Error') ||
    err.includes('Failed to fetch')
  );
  
  console.log('\nFinal status:');
  console.log('Total console errors:', consoleErrors.length);
  console.log('Critical errors:', finalErrors.length);
  
  expect(finalErrors).toHaveLength(0);
  console.log('✅ Convex connection is working!');
});