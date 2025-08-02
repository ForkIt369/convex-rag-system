import { test } from '@playwright/test';

test('Debug Environment Variables', async ({ page }) => {
  await page.goto('https://convex-rag-system.vercel.app');
  await page.waitForTimeout(2000);
  
  // Check if we're seeing the configuration error screen
  const bodyText = await page.textContent('body');
  console.log('\nPage contains "Configuration Required":', bodyText?.includes('Configuration Required'));
  console.log('Page contains "placeholder.convex.cloud":', bodyText?.includes('placeholder.convex.cloud'));
  
  // Take screenshot
  await page.screenshot({ path: 'production-debug.png', fullPage: true });
  console.log('\nScreenshot saved as production-debug.png');
  
  // Try to extract any Convex-related info from the page
  const scripts = await page.$$eval('script', elements => 
    elements.map(el => el.textContent || '').filter(text => text.includes('convex'))
  );
  
  console.log('\nScripts containing "convex":', scripts.length);
  
  // Check network requests
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('convex')) {
      requests.push(request.url());
    }
  });
  
  // Navigate to trigger any API calls
  await page.getByRole('button', { name: /Documents/i }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);
  
  console.log('\nConvex-related requests:', requests.length);
  requests.forEach(url => console.log('  -', url));
});