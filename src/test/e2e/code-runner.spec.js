import { test, expect } from '@playwright/test';

test.describe('Code runners', () => {
  test('Run R code', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByRole('button', { name: 'add New Notebook' }).nth(1).click();
    await page.getByRole('button', { name: 'R', exact: true }).click();
    await page.getByRole('textbox', { name: 'Code editor' }).click();
    await page.getByRole('textbox', { name: 'Code editor' }).fill('for (i in 1:10) {\n   print(i)\n}\n');
    await page.getByRole('button', { name: 'play_arrow' }).click();
    await expect(page.locator('pre')).toContainText('[1] 1 [1] 2 [1] 3 [1] 4 [1] 5 [1] 6 [1] 7 [1] 8 [1] 9 [1] 10');
  });
  
  test('Run Python code', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.getByRole('button', { name: 'add New Notebook' }).nth(1).click();
      await page.getByRole('button', { name: 'Py', exact: true }).click();
      await page.getByRole('textbox', { name: 'Code editor' }).click();
      await page.getByRole('textbox', { name: 'Code editor' }).fill('a = [1,2,3]\nfor i in a:\n   print(i)\n');
      await page.getByRole('button', { name: 'play_arrow' }).click();
      await expect(page.locator('pre')).toContainText('1 2 3');
  });

  test('Load python library', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.getByRole('button', { name: 'add New Notebook' }).nth(1).click();
      await page.getByRole('button', { name: 'Py', exact: true }).click();
      await page.getByRole('textbox', { name: 'Code editor' }).first().click();
      await page.getByRole('textbox', { name: 'Code editor' }).first().fill('import numpy\n');
      await page.getByRole('button', { name: 'Install' }).click();
      await expect(page.getByRole('textbox', { name: 'Code editor' }).first()).toHaveValue('import micropip\nawait micropip.install(\'numpy\')\nimport numpy\n');
  });

});