import { expect, test } from '@playwright/test';

test.describe('prompt text panel', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('middle panel real-time update and copy', async ({ page, context }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const middlePanel = page.locator('main');
    await expect(middlePanel).toContainText('片段区为空，请从右侧加入提示词');
    const copyButton = page.getByTestId('prompt-text-copy');
    await expect(copyButton).toBeDisabled();

    // Verify copy button remains disabled in other formats when empty
    await page.getByTestId('prompt-text-format-yaml').click();
    await expect(copyButton).toBeDisabled();
    await page.getByTestId('prompt-text-format-xml').click();
    await expect(copyButton).toBeDisabled();
    await page.getByTestId('prompt-text-format-markdown').click();
    await expect(copyButton).toBeDisabled();

    const libraryPanel = page.locator('aside').last();
    await libraryPanel.getByRole('button', { name: '新建分组' }).click();
    await libraryPanel.getByPlaceholder('分组名称...').fill('Group A');
    await page.keyboard.press('Enter');
    
    const libGroup = libraryPanel.locator('[data-testid="library-group-Group A"]');
    await libGroup.getByRole('button', { name: '添加提示词' }).click();
    
    const libItem = libGroup.locator('[data-testid^="library-item-"]').first();
    await page.getByPlaceholder('输入内容...').fill('Hello Prompt');
    await page.getByRole('button', { name: '保存' }).click();
    
    await libItem.hover();
    await libItem.getByTitle('加入片段区').click();

    const promptText = page.getByTestId('prompt-text');
    await expect(promptText).toBeVisible();

    // 1. Markdown Format (Default)
    await expect(promptText).toContainText('##Group A');
    await expect(promptText).toContainText('Hello Prompt;');

    await copyButton.click();
    await expect(page.getByText('已复制').first()).toBeVisible();
    let clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe('##Group A\nHello Prompt;');

    // 2. YAML Format
    await page.getByTestId('prompt-text-format-yaml').click();
    await expect(promptText).toContainText('Group A:');
    await expect(promptText).toContainText('- Hello Prompt;');
    await expect(promptText).not.toContainText('##Group A');

    await copyButton.click();
    await expect(page.getByText('已复制').first()).toBeVisible();
    clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe('Group A:\n  - Hello Prompt;');

    // 3. XML Format
    await page.getByTestId('prompt-text-format-xml').click();
    await expect(promptText).toContainText('<prompts>');
    await expect(promptText).toContainText('<snippet>Hello Prompt;</snippet>');

    await copyButton.click();
    await expect(page.getByText('已复制').first()).toBeVisible();
    clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe('<prompts>\n  <group name="Group A">\n    <snippet>Hello Prompt;</snippet>\n  </group>\n</prompts>');

  });
});
