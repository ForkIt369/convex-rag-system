import { test } from '@playwright/test';

test('Check Console Logs', async ({ page }) => {
  const logs: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`Browser ${msg.type()}: ${text}`);
  });
  
  await page.goto('https://convex-rag-system.vercel.app');
  await page.waitForTimeout(2000);
  
  console.log('\n=== All Console Logs ===');
  logs.forEach(log => console.log(log));
  
  // Check for ConvexProvider logs
  const convexLogs = logs.filter(log => log.includes('ConvexProvider'));
  console.log('\n=== Convex Provider Logs ===');
  convexLogs.forEach(log => console.log(log));
});