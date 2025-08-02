import { test, expect } from '@playwright/test';

test('Final Production Verification', async ({ page }) => {
  console.log('\n🚀 Starting final production verification...');
  
  // Monitor console and network
  const consoleMessages: string[] = [];
  const apiCalls: string[] = [];
  const networkErrors: string[] = [];
  
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('convex.cloud')) {
      apiCalls.push(url);
      console.log(`📡 API Call: ${url}`);
    }
  });
  
  page.on('requestfailed', request => {
    networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`);
    console.log(`❌ Request Failed: ${request.url()}`);
  });
  
  // Load the app
  await page.goto('https://convex-rag-system.vercel.app');
  await page.waitForLoadState('networkidle');
  
  console.log('\n📋 App loaded, checking initial state...');
  
  // Check for proper loading
  await expect(page).toHaveTitle(/RAG System/);
  console.log('✅ Title is correct');
  
  // Test each tab functionality
  const tabs = [
    { name: 'Documents', expectedContent: /Upload Documents|Drop files here/ },
    { name: 'Memories', expectedContent: /Memory Type|Create Memory/ },
    { name: 'Pipeline', expectedContent: /RAG Pipeline|Flow|Architecture/ },
    { name: 'Search', expectedContent: /Search|Query|Results/ }
  ];
  
  for (const tab of tabs) {
    console.log(`\n🔍 Testing ${tab.name} tab...`);
    await page.getByRole('button', { name: new RegExp(tab.name, 'i') }).click();
    await page.waitForTimeout(1000);
    
    // Check for content
    const contentVisible = await page.locator('text=' + tab.expectedContent.source).count() > 0;
    console.log(`  Content visible: ${contentVisible ? '✅' : '❌'}`);
    
    // Check for errors
    const errorCount = await page.locator('text=/Error|Failed/i').count();
    console.log(`  Error indicators: ${errorCount === 0 ? '✅ None' : `❌ ${errorCount} found`}`);
    
    // Take screenshot for manual review
    await page.screenshot({ path: `final-${tab.name.toLowerCase()}.png` });
  }
  
  // Check Convex connectivity by examining the client setup
  const convexUrlElement = await page.evaluate(() => {
    return (window as any).NEXT_PUBLIC_CONVEX_URL || 'not-found';
  });
  console.log(`\n🔗 Convex URL in browser: ${convexUrlElement}`);
  
  // Summary
  console.log('\n📊 Final Summary:');
  console.log(`  Total API calls to Convex: ${apiCalls.length}`);
  console.log(`  Network errors: ${networkErrors.length}`);
  console.log(`  Console errors: ${consoleMessages.filter(m => m.startsWith('error')).length}`);
  
  // Assertions
  expect(networkErrors).toHaveLength(0);
  expect(consoleMessages.filter(m => m.includes('CONVEX') && m.includes('error'))).toHaveLength(0);
  
  console.log('\n✅ Production verification complete!');
});