import { expect, test } from '@playwright/test';

test.describe('Error Paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('搜索提示词...')).toBeVisible();
  });

  test('import invalid JSON shows error toast', async ({ page }) => {
    const libraryPanel = page.locator('aside').last();
    
    await libraryPanel.getByRole('button', { name: '新建分组' }).click();
    await libraryPanel.getByPlaceholder('分组名称...').fill('Initial Group');
    await page.keyboard.press('Enter');
    await expect(libraryPanel.locator('[data-testid="library-group-Initial Group"]')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{'),
    });

    await expect(page.getByText('无效的文件格式')).toBeVisible();
    
    await expect(page.getByText('当前数据将被以下内容覆盖：')).not.toBeVisible();

    await expect(libraryPanel.locator('[data-testid="library-group-Initial Group"]')).toBeVisible();
    await expect(libraryPanel.locator('[data-testid^="library-group-"]')).toHaveCount(1);
  });

  test('import unsupported schema version shows error toast', async ({ page }) => {
    const libraryPanel = page.locator('aside').last();

    await libraryPanel.getByRole('button', { name: '新建分组' }).click();
    await libraryPanel.getByPlaceholder('分组名称...').fill('Persistent Group');
    await page.keyboard.press('Enter');
    await expect(libraryPanel.locator('[data-testid="library-group-Persistent Group"]')).toBeVisible();

    const invalidSchema = JSON.stringify({
      schemaVersion: 999,
      library: { groupOrder: [], groups: {}, prompts: {} }
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'unsupported_version.json',
      mimeType: 'application/json',
      buffer: Buffer.from(invalidSchema),
    });

    await expect(page.getByText('无效的文件格式')).toBeVisible();

    await expect(libraryPanel.locator('[data-testid="library-group-Persistent Group"]')).toBeVisible();
    await expect(libraryPanel.locator('[data-testid^="library-group-"]')).toHaveCount(1);
  });

  test('create duplicate group name shows error toast', async ({ page }) => {
    const libraryPanel = page.locator('aside').last();
    
    await libraryPanel.getByRole('button', { name: '新建分组' }).click();
    await libraryPanel.getByPlaceholder('分组名称...').fill('Duplicate Group');
    await page.keyboard.press('Enter');
    await expect(libraryPanel.locator('[data-testid="library-group-Duplicate Group"]')).toBeVisible();

    await libraryPanel.getByRole('button', { name: '新建分组' }).click();
    await libraryPanel.getByPlaceholder('分组名称...').fill('Duplicate Group');
    await page.keyboard.press('Enter');

    await expect(page.getByText('创建失败 (名称重复?)')).toBeVisible();

    const groups = libraryPanel.locator('[data-testid^="library-group-"]');
    await expect(groups).toHaveCount(1);
  });
});
