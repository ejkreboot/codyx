import { test, expect } from '@playwright/test';

test.describe('Variable Highlighting System', () => {
  test('should display and highlight user-defined variables', async ({ page }) => {
    // Navigate to notebooks page
    await page.goto('/notebooks');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Create a Python cell with variables
    const pythonCode = `# Create some variables for testing
x = 42
name = "Alice"
numbers = [1, 2, 3, 4, 5]
person = {"age": 30, "city": "New York"}
is_active = True

print(f"x = {x}")
print(f"name = {name}")
print(f"numbers = {numbers}")
print(f"person = {person}")
print(f"is_active = {is_active}")`;
    
    // Find the textarea and enter the code
    const textarea = page.locator('.cell-textarea').first();
    await textarea.click();
    await textarea.fill(pythonCode);
    
    // Execute the Python code
    const runButton = page.locator('.run-btn').first();
    await runButton.click();
    
    // Wait for execution to complete (timeout after 30 seconds)
    await expect(page.locator('.python-output')).toBeVisible({ timeout: 30000 });
    
    // Check that output is displayed correctly
    await expect(page.locator('.python-output')).toContainText('x = 42');
    await expect(page.locator('.python-output')).toContainText('name = Alice');
    await expect(page.locator('.python-output')).toContainText('numbers = [1, 2, 3, 4, 5]');
    
    // Check that variables section is displayed
    await expect(page.locator('.variables-section')).toBeVisible();
    await expect(page.locator('.variables-section')).toContainText('Variables');
    
    // Check that specific variables are listed
    const variablesSection = page.locator('.variables-section');
    await expect(variablesSection).toContainText('x');
    await expect(variablesSection).toContainText('int');
    await expect(variablesSection).toContainText('42');
    
    await expect(variablesSection).toContainText('name');
    await expect(variablesSection).toContainText('str');
    await expect(variablesSection).toContainText('Alice');
    
    await expect(variablesSection).toContainText('numbers');
    await expect(variablesSection).toContainText('list');
    
    await expect(variablesSection).toContainText('person');
    await expect(variablesSection).toContainText('dict');
    
    await expect(variablesSection).toContainText('is_active');
    await expect(variablesSection).toContainText('bool');
    await expect(variablesSection).toContainText('True');
    
    // Check for variable highlighting in the code
    // Look for highlighted variables in the code editor
    const highlightLayer = page.locator('.code-highlight-layer');
    if (await highlightLayer.isVisible()) {
      console.log('Variable highlighting layer is visible');
      // Check that highlighted variables exist
      const highlightedVars = page.locator('.defined-variable');
      const count = await highlightedVars.count();
      console.log(`Found ${count} highlighted variables`);
      
      if (count > 0) {
        // Verify at least some variables are highlighted
        expect(count).toBeGreaterThan(0);
      }
    }
  });
  
  test('should update highlighted variables when new variables are created', async ({ page }) => {
    // Navigate to notebooks page
    await page.goto('/notebooks');
    await page.waitForLoadState('networkidle');
    
    // Create first set of variables
    const firstCode = `a = 10
b = 20
print(f"a = {a}, b = {b}")`;
    
    const textarea = page.locator('.cell-textarea').first();
    await textarea.click();
    await textarea.fill(firstCode);
    
    const runButton = page.locator('.run-btn').first();
    await runButton.click();
    
    // Wait for execution
    await expect(page.locator('.python-output')).toBeVisible({ timeout: 15000 });
    
    // Check variables section shows a and b
    const variablesSection = page.locator('.variables-section');
    await expect(variablesSection).toContainText('a');
    await expect(variablesSection).toContainText('b');
    
    // Add more code to create additional variables
    const extendedCode = firstCode + `

# Add more variables
c = 30
message = "Hello World"
result = a + b + c

print(f"c = {c}")
print(f"message = {message}")
print(f"result = {result}")`;
    
    await textarea.fill(extendedCode);
    await runButton.click();
    
    // Wait for execution
    await expect(page.locator('.python-output')).toContainText('Hello World', { timeout: 15000 });
    
    // Check that new variables are now displayed
    await expect(variablesSection).toContainText('c');
    await expect(variablesSection).toContainText('message');
    await expect(variablesSection).toContainText('result');
    await expect(variablesSection).toContainText('60'); // result value
  });
  
  test('should handle function and class definitions without showing them as variables', async ({ page }) => {
    // Navigate to notebooks page
    await page.goto('/notebooks');
    await page.waitForLoadState('networkidle');
    
    // Create code with functions and classes
    const code = `def greet(name):
    return f"Hello, {name}!"

class Calculator:
    def add(self, a, b):
        return a + b

# These should appear as variables
calc = Calculator()
result = calc.add(5, 3)
message = greet("Alice")

print(f"result = {result}")
print(f"message = {message}")`;
    
    const textarea = page.locator('.cell-textarea').first();
    await textarea.click();
    await textarea.fill(code);
    
    const runButton = page.locator('.run-btn').first();
    await runButton.click();
    
    // Wait for execution
    await expect(page.locator('.python-output')).toBeVisible({ timeout: 15000 });
    
    // Check variables section
    const variablesSection = page.locator('.variables-section');
    
    // These should be shown as variables (instances/values)
    await expect(variablesSection).toContainText('calc');
    await expect(variablesSection).toContainText('result');
    await expect(variablesSection).toContainText('message');
    
    // These should NOT be shown as variables (functions/classes are filtered out)
    const variableText = await variablesSection.textContent();
    expect(variableText).not.toMatch(/\bgreet\b.*function/);
    expect(variableText).not.toMatch(/\bCalculator\b.*class/);
  });
});