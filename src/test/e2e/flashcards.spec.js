import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/flashcards');
  await page.getByRole('button', { name: 'add Create New Deck' }).click();
  await page.getByRole('button', { name: 'edit' }).first().click();
  await page.getByRole('textbox').fill('restless-math2');
  await page.getByRole('button', { name: 'check' }).click();
  await page.getByRole('button', { name: 'edit Edit Deck' }).click();
  await page.getByRole('button', { name: 'Click to add topic edit' }).click();
  await page.getByRole('textbox', { name: 'Topic:' }).click();
  await page.getByRole('textbox', { name: 'Topic:' }).fill('A test topic');
  await page.getByRole('button', { name: 'Click to add description edit' }).click();
  await page.getByRole('textbox', { name: 'Description:' }).click();
  await page.getByRole('textbox', { name: 'Description:' }).fill('A test description');
  await page.getByRole('button', { name: 'check' }).nth(1).click();
  await expect(page.locator('body')).toContainText('A test description');
  await page.getByRole('button', { name: 'This is your first card. Edit' }).click();
  await page.getByRole('textbox', { name: 'Enter your answer here... Use' }).fill('This card was edited');
  await page.getByTitle('Save (Ctrl+Enter)').click();
  await expect(page.locator('body')).toContainText('This card was edited');
});