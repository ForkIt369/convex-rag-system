import { test, expect } from '@playwright/test';

const BASE_URL = 'https://convex-rag-system.vercel.app';

test.describe('Convex RAG System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should load the application', async ({ page }) => {
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Convex RAG System/);
    
    // Check if main navigation is visible
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should show all tabs', async ({ page }) => {
    // Check Documents tab
    const documentsTab = page.getByRole('button', { name: /Documents/i });
    await expect(documentsTab).toBeVisible();
    
    // Check Memories tab
    const memoriesTab = page.getByRole('button', { name: /Memories/i });
    await expect(memoriesTab).toBeVisible();
    
    // Check Pipeline tab
    const pipelineTab = page.getByRole('button', { name: /Pipeline/i });
    await expect(pipelineTab).toBeVisible();
    
    // Check Search tab
    const searchTab = page.getByRole('button', { name: /Search/i });
    await expect(searchTab).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Click on Memories tab
    await page.getByRole('button', { name: /Memories/i }).click();
    await expect(page.getByText(/Cognitive Memory Storage/)).toBeVisible();
    
    // Click on Pipeline tab
    await page.getByRole('button', { name: /Pipeline/i }).click();
    await expect(page.getByText(/RAG Pipeline Overview/)).toBeVisible();
    
    // Click on Search tab
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page.getByText(/Vector Search Test/)).toBeVisible();
    
    // Go back to Documents tab
    await page.getByRole('button', { name: /Documents/i }).click();
    await expect(page.getByText(/Document Management/)).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate through all tabs
    await page.getByRole('button', { name: /Documents/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /Memories/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /Pipeline/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /Search/i }).click();
    await page.waitForTimeout(1000);
    
    // Check if any critical errors occurred
    const criticalErrors = errors.filter(err => 
      err.includes('Failed to load resource') || 
      err.includes('[CONVEX Q(functions') ||
      err.includes('Error:')
    );
    
    // Log errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Errors found:', criticalErrors);
    }
  });

  test('should check document upload functionality', async ({ page }) => {
    await page.getByRole('button', { name: /Documents/i }).click();
    
    // Check if upload area is visible
    const uploadArea = page.locator('text=/Drop files here or click to upload/i');
    await expect(uploadArea).toBeVisible();
  });

  test('should check memory creation form', async ({ page }) => {
    await page.getByRole('button', { name: /Memories/i }).click();
    
    // Check if memory creation form elements are present
    const memoryTypeSelect = page.locator('select').first();
    await expect(memoryTypeSelect).toBeVisible();
    
    const contentTextarea = page.locator('textarea[placeholder*="memory content"]');
    await expect(contentTextarea).toBeVisible();
    
    const createButton = page.getByRole('button', { name: /Create Memory/i });
    await expect(createButton).toBeVisible();
  });

  test('should check search functionality', async ({ page }) => {
    await page.getByRole('button', { name: /Search/i }).click();
    
    // Check if search input is present
    const searchInput = page.locator('input[placeholder*="search query"]');
    await expect(searchInput).toBeVisible();
    
    const searchButton = page.getByRole('button', { name: /Search/i });
    await expect(searchButton).toBeVisible();
  });
});

// Check for specific Convex errors
test('should check for Convex connection', async ({ page }) => {
  const response = await page.goto(BASE_URL);
  
  // Check if page loads successfully
  expect(response?.status()).toBeLessThan(400);
  
  // Wait for potential Convex errors
  await page.waitForTimeout(3000);
  
  // Check for error messages
  const errorMessages = await page.locator('text=/Error:|Failed to load|could not find public function/i').count();
  
  if (errorMessages > 0) {
    const errorText = await page.locator('text=/Error:|Failed to load|could not find public function/i').first().textContent();
    console.log('Convex Error found:', errorText);
  }
  
  expect(errorMessages).toBe(0);
});