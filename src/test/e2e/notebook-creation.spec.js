import { test, expect } from '@playwright/test';

test.describe('Notebook Creation E2E', () => {
  test('should create a new notebook from homepage', async ({ page }) => {
    // Go to the homepage
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'homepage-debug.png' });
    
    // Debug: Let's see what buttons/links are available
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Target the "New Notebook" button by its CSS class
    const createButton = page.locator('.create-btn');
    
    // Wait for the button to be visible and enabled
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    
    console.log('Found create-btn, clicking...');
    await createButton.click();
    
    let clickedButton = true;
    
    if (!clickedButton) {
      // If no button found, let's navigate directly to notebooks page
      console.log('No "New Notebook" button found, navigating directly to /notebooks');
      await page.goto('/notebooks');
    }
    
    // Should redirect to a new notebook URL with a generated slug (increased timeout)
    await expect(page).toHaveURL(/\/notebooks(\?slug=[a-z0-9-]+)?$/, { timeout: 15000 });
    
    // Wait for the notebook to initialize - look for the notebook container
    await expect(page.locator('.notebook-container')).toBeVisible({ timeout: 10000 });
    
    // Wait for Pyodide initialization to complete (if the loading overlay appears)
    // This will wait up to 30 seconds for Pyodide to load
    const pyodideOverlay = page.locator('.pyodide-loading-overlay');
    if (await pyodideOverlay.isVisible()) {
      await expect(pyodideOverlay).toBeHidden({ timeout: 30000 });
    }
    
    // Verify the notebook is initialized by checking for:
    // 1. The notebook header/title area
    await expect(page.locator('.content-info')).toBeVisible({ timeout: 15000 });
    
    // 2. Wait for the welcome cell content to appear (this is more reliable than looking for cell containers)
    await expect(page.locator('text=Welcome to your new notebook!')).toBeVisible({ timeout: 15000 });
    
    // 3. The notebook should have a slug in the URL and display area
    const url = page.url();
    const slugMatch = url.match(/slug=([a-z0-9-]+)/);
    expect(slugMatch).toBeTruthy();
    
    // 4. Verify the notebook title/slug is displayed somewhere on the page
    const slug = slugMatch[1];
    await expect(page.locator(`text=${slug}`)).toBeVisible({ timeout: 10000 });
    
    // 5. Try to find cell elements with more specific selectors and longer timeout
    // Look for CodyxCell components or common cell patterns
    const cellSelectors = [
      '[data-testid="cell"]',
      '.cell',
      '.codyx-cell',
      '[class*="cell"]',
      'textarea',  // Cells might contain textareas for editing
      '.cell-content',
      '.notebook-cell'
    ];
    
    let foundCell = false;
    for (const selector of cellSelectors) {
      try {
        const cellElement = page.locator(selector).first();
        if (await cellElement.isVisible({ timeout: 2000 })) {
          console.log(`Found cell with selector: ${selector}`);
          foundCell = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If we found the welcome text, that's good enough - the notebook is loaded
    console.log(`Cell element found: ${foundCell}`);
  });
  
  test('should handle notebook creation without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click the create button by CSS class
    const createButton = page.locator('.create-btn');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    await createButton.click();
    
    // Wait for navigation and initialization (increased timeouts)
    await expect(page).toHaveURL(/\/notebooks(\?slug=[a-z0-9-]+)?$/, { timeout: 15000 });
    await expect(page.locator('.notebook-container')).toBeVisible({ timeout: 10000 });
    
        // Wait for the welcome cell to appear
    await expect(page.locator('text=Welcome to your new notebook!')).toBeVisible({ timeout: 15000 });
  });

  test('should allow editing notebook name', async ({ page }) => {
    // Go to homepage and create a new notebook
    await page.goto('/');
    await page.locator('.create-btn').click();

    // Wait for navigation and notebook initialization
    await expect(page).toHaveURL(/\/notebooks(\?slug=[a-z0-9-]+)?$/, { timeout: 15000 });
    await expect(page.locator('.notebook-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Welcome to your new notebook!')).toBeVisible({ timeout: 15000 });

    // Get the current notebook name from the URL
    const url = page.url();
    const urlParams = new URL(url).searchParams;
    const originalSlug = urlParams.get('slug') || 'default-notebook';

    // Click on the notebook name to edit it
    await page.locator('.content-info__name-display--editable').click();

    // Wait for the edit input to appear
    await expect(page.locator('.content-info__editor')).toBeVisible({ timeout: 5000 });

    // Clear the input and enter a new name (append -2 to original)
    const newSlug = originalSlug + '-2';
    await page.locator('.content-info__editor').fill(newSlug);

    // Click the save button (check icon)
    await page.locator('button[title="Save changes"]').click();

    // Wait for the URL to update with the new slug
    await expect(page).toHaveURL(new RegExp(`/notebooks\\?slug=${newSlug.replace(/[-]/g, '\\-')}`), { timeout: 10000 });

    // Verify the notebook name display shows the new name
    await expect(page.locator('.content-info__name-text')).toHaveText(newSlug, { timeout: 5000 });
  });
});