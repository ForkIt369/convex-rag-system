import { test } from '@playwright/test';

test('Investigate Production Errors', async ({ page }) => {
  // Enhanced console monitoring
  const logs: { type: string; text: string }[] = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });

  // Monitor network
  const failedRequests: string[] = [];
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });

  await page.goto('https://convex-rag-system.vercel.app');
  await page.waitForTimeout(3000);

  // Check page content
  const bodyText = await page.textContent('body');
  console.log('Page contains "Loading":', bodyText?.includes('Loading'));
  console.log('Page contains "Error":', bodyText?.includes('Error'));
  console.log('Page contains "Failed":', bodyText?.includes('Failed'));

  // Take screenshot
  await page.screenshot({ path: 'production-state.png', fullPage: true });

  // Try each tab
  const tabs = ['Documents', 'Memories', 'Pipeline', 'Search'];
  for (const tab of tabs) {
    console.log(`\nChecking ${tab} tab...`);
    
    try {
      await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
      await page.waitForTimeout(1500);
      
      // Check for specific error patterns
      const loadingCount = await page.locator('text=/Loading/i').count();
      const errorCount = await page.locator('text=/Error|Failed/i').count();
      const emptyCount = await page.locator('text=/No .* found|Empty/i').count();
      
      console.log(`  Loading indicators: ${loadingCount}`);
      console.log(`  Error indicators: ${errorCount}`);
      console.log(`  Empty state indicators: ${emptyCount}`);
      
      // Take screenshot of each tab
      await page.screenshot({ path: `production-${tab.toLowerCase()}.png`, fullPage: true });
    } catch (error) {
      console.log(`  Failed to check ${tab}: ${error}`);
    }
  }

  // Log all console messages
  console.log('\nAll console logs:');
  logs.forEach(log => {
    if (log.type !== 'log') {
      console.log(`  [${log.type}] ${log.text}`);
    }
  });

  // Log failed requests
  if (failedRequests.length > 0) {
    console.log('\nFailed requests:');
    failedRequests.forEach(req => console.log(`  ${req}`));
  }
});