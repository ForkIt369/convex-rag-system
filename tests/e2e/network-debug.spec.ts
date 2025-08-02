import { test } from '@playwright/test';

test('Debug Network and CORS', async ({ page }) => {
  const networkRequests: any[] = [];
  const failedRequests: any[] = [];
  
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  });
  
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });
  
  page.on('response', response => {
    if (response.url().includes('convex')) {
      console.log(`Convex Response: ${response.status()} ${response.url()}`);
    }
  });
  
  await page.goto('https://convex-rag-system.vercel.app');
  await page.waitForTimeout(2000);
  
  // Navigate through tabs to trigger API calls
  for (const tab of ['Documents', 'Memories']) {
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    await page.waitForTimeout(1500);
  }
  
  console.log('\n=== Network Summary ===');
  console.log(`Total requests: ${networkRequests.length}`);
  console.log(`Failed requests: ${failedRequests.length}`);
  
  const convexRequests = networkRequests.filter(r => r.url.includes('convex'));
  console.log(`\nConvex requests: ${convexRequests.length}`);
  
  if (convexRequests.length > 0) {
    console.log('\nConvex Request Details:');
    convexRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
    });
  }
  
  if (failedRequests.length > 0) {
    console.log('\nFailed Requests:');
    failedRequests.forEach(req => {
      console.log(`  ${req.url}: ${req.failure}`);
    });
  }
  
  // Check if Convex client is initialized
  const convexStatus = await page.evaluate(() => {
    return {
      hasConvexProvider: !!document.querySelector('[data-convex-provider]'),
      windowHasConvex: typeof (window as any).__convex !== 'undefined'
    };
  });
  
  console.log('\nConvex Client Status:');
  console.log(`  Has ConvexProvider: ${convexStatus.hasConvexProvider}`);
  console.log(`  Window has Convex: ${convexStatus.windowHasConvex}`);
});