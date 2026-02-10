import { expect, test } from '@playwright/test';

test.describe('Empty State Guidance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto('/');
  });

  test('should show empty states in all panels when localStorage is empty', async ({ page }) => {
    const fragmentsEmpty = page.getByTestId('fragments-empty');
    const libraryEmpty = page.getByTestId('library-empty');
    const promptTextEmpty = page.getByTestId('prompt-text-empty');

    await expect(fragmentsEmpty).toBeVisible();
    await expect(libraryEmpty).toBeVisible();
    await expect(promptTextEmpty).toBeVisible();

    await expect(fragmentsEmpty).toContainText('暂无分组');
    await expect(libraryEmpty).toContainText('暂无分组');
    await expect(promptTextEmpty).toContainText('片段区为空，请从右侧加入提示词');

    await expect(fragmentsEmpty.getByRole('button', { name: '新建' })).toBeVisible();
    await expect(libraryEmpty.getByRole('button', { name: '新建' })).toBeVisible();

    const copyButton = page.getByTestId('prompt-text-copy');
    await expect(copyButton).toBeDisabled();
  });
});
