import { test, expect } from '@playwright/test';

test.describe('JsProxy Error Fix', () => {
  test('should execute Python code without JsProxy errors', async ({ page }) => {
    // Navigate to notebooks page
    await page.goto('/notebooks');
    await page.waitForLoadState('networkidle');
    
    // Simple Python code to test
    const pythonCode = `# Simple variable test
x = 42
name = "test"
print(f"x = {x}, name = {name}")`;
    
    // Find textarea and enter code
    const textarea = page.locator('.cell-textarea').first();
    await textarea.click();
    await textarea.fill(pythonCode);
    
    // Execute the code
    const runButton = page.locator('.run-btn').first();
    await runButton.click();
    
    // Wait for execution and check for success (no JsProxy error)
    await expect(page.locator('.python-output')).toBeVisible({ timeout: 15000 });
    
    // Check that output contains expected result
    const output = page.locator('.python-output');
    await expect(output).toContainText('x = 42, name = test');
    
    // Check that no error is displayed
    const errorElement = page.locator('.python-error');
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      expect(errorText).not.toContain('JsProxy');
      expect(errorText).not.toContain('unhashable type');
    }
    
    // Check that variables section appears
    await expect(page.locator('.variables-section')).toBeVisible();
  });
});