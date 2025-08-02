import { test } from '@playwright/test';

test('debug deployment', async ({ page }) => {
  const url = 'https://convex-rag-system.vercel.app';
  
  console.log('Navigating to:', url);
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  
  console.log('Response status:', response?.status());
  console.log('Response URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Take a screenshot
  await page.screenshot({ path: 'deployment-debug.png', fullPage: true });
  
  // Check for any error messages
  const bodyText = await page.textContent('body');
  console.log('Page contains:', bodyText?.substring(0, 500));
  
  // Wait a bit and check for Convex errors
  await page.waitForTimeout(2000);
  
  // Check browser console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
});