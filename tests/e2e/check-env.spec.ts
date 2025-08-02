import { test } from '@playwright/test';

test('Check Environment Variables in Production', async ({ page }) => {
  await page.goto('https://convex-rag-system.vercel.app');
  
  // Check page source for environment variable
  const pageContent = await page.content();
  
  // Check if placeholder URL is being used
  if (pageContent.includes('placeholder.convex.cloud')) {
    console.log('❌ ERROR: App is using placeholder Convex URL!');
    console.log('This means NEXT_PUBLIC_CONVEX_URL is not set in the build.');
  }
  
  // Check if configuration error is shown
  const configError = await page.locator('text="Configuration Required"').count();
  if (configError > 0) {
    console.log('❌ ERROR: Configuration Required screen is showing!');
    console.log('The app thinks NEXT_PUBLIC_CONVEX_URL is not set.');
    
    // Take screenshot
    await page.screenshot({ path: 'config-error.png', fullPage: true });
  }
  
  // Try to get the actual Convex URL from the app
  const actualUrl = await page.evaluate(() => {
    // Check various possible locations
    const checks = {
      'process.env.NEXT_PUBLIC_CONVEX_URL': typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONVEX_URL,
      'window.__NEXT_DATA__': (window as any).__NEXT_DATA__?.props?.pageProps?.convexUrl,
      'window.NEXT_PUBLIC_CONVEX_URL': (window as any).NEXT_PUBLIC_CONVEX_URL,
    };
    return checks;
  });
  
  console.log('\nEnvironment variable checks:');
  console.log(JSON.stringify(actualUrl, null, 2));
  
  // Check Next.js build ID
  const buildId = await page.evaluate(() => (window as any).__NEXT_DATA__?.buildId);
  console.log(`\nBuild ID: ${buildId}`);
});