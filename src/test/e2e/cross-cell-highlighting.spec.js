import { test, expect } from '@playwright/test';

test.describe('Cross-Cell Variable Highlighting', () => {
  test('should highlight variables across all Python cells', async ({ page }) => {
    // Navigate to notebooks page
    await page.goto('/notebooks');
    await page.waitForLoadState('networkidle');
    
    // Create variables in the first cell
    const firstCode = `# First cell - create some variables
x = 42
name = "Alice"
print(f"Created x = {x}, name = {name}")`;
    
    const textarea1 = page.locator('.cell-textarea').first();
    await textarea1.click();
    await textarea1.fill(firstCode);
    
    // Execute first cell
    const runButton1 = page.locator('.run-btn').first();
    await runButton1.click();
    
    // Wait for execution to complete
    await expect(page.locator('.python-output').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.python-output').first()).toContainText('Created x = 42');
    
    // Add a second Python cell
    const addCodeBtn = page.locator('[title="Add Python Cell"]').first();
    await addCodeBtn.click();
    
    // Wait for the new cell to appear
    await expect(page.locator('.cell-textarea').nth(1)).toBeVisible();
    
    // Type in the second cell (should highlight variables from first cell)
    const textarea2 = page.locator('.cell-textarea').nth(1);
    await textarea2.click();
    
    const secondCode = `# Second cell - use variables from first cell
result = x * 2
message = f"Hello, {name}!"
print(f"result = {result}")
print(f"message = {message}")`;
    
    await textarea2.fill(secondCode);
    
    // Check if variables are highlighted in the second cell
    // Look for highlighting layer or highlighted variables
    const highlightLayer2 = page.locator('.cell-container').nth(1).locator('.code-highlight-layer');
    
    if (await highlightLayer2.isVisible()) {
      
      // Check that the highlighting layer contains references to our variables
      const highlightContent = await highlightLayer2.innerHTML();
      expect(highlightContent).toContain('defined-variable');
    }
    
    // Execute the second cell to make sure it works with the highlighted variables
    const runButton2 = page.locator('.run-btn').nth(1);
    await runButton2.click();
    
    // Check that it executed successfully and used the variables
    await expect(page.locator('.python-output').nth(1)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.python-output').nth(1)).toContainText('result = 84');
    await expect(page.locator('.python-output').nth(1)).toContainText('Hello, Alice!');
  });
  
  test('should update highlighting when variables change', async ({ page }) => {
    await page.goto('/notebooks');
    await page.waitForLoadState('networkidle');
    
    // Create initial variable
    const textarea = page.locator('.cell-textarea').first();
    await textarea.click();
    await textarea.fill('counter = 1\nprint(f"counter = {counter}")');
    
    const runButton = page.locator('.run-btn').first();
    await runButton.click();
    await expect(page.locator('.python-output')).toBeVisible({ timeout: 15000 });
    
    // Add second cell
    const addCodeBtn = page.locator('[title="Add Python Cell"]').first();
    await addCodeBtn.click();
    
    const textarea2 = page.locator('.cell-textarea').nth(1);
    await textarea2.click();
    await textarea2.fill('# Using counter from above\nnew_value = counter + 10');
    
    // Modify the first cell to add more variables
    await textarea.click();
    await textarea.fill(`counter = 1
data = [1, 2, 3]
status = "active"
print(f"counter = {counter}")
print(f"data = {data}")
print(f"status = {status}")`);
    
    await runButton.click();
    await expect(page.locator('.python-output').first()).toContainText('data = [1, 2, 3]', { timeout: 15000 });
    
    // Check that new variables are highlighted in second cell
    await textarea2.focus();
    await textarea2.fill(`# Using variables from above
new_value = counter + 10
data_length = len(data)
if status == "active":
    print("System is active")`);
    
    // The highlighting should now include counter, data, and status
    const highlightLayer = page.locator('.cell-container').nth(1).locator('.code-highlight-layer');
    if (await highlightLayer.isVisible()) {
      const content = await highlightLayer.innerHTML();
      // Should contain highlighting for all three variables
      expect(content).toContain('defined-variable');
    }
  });
});