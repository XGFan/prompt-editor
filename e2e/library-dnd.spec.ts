import { expect, test } from '@playwright/test';

test('library drag and drop', async ({ page }) => {
  test.setTimeout(60000);
  
  await page.goto('/');

  const libraryPanel = page.locator('aside').last();

  await libraryPanel.getByRole('button', { name: '新建分组' }).click();
  await libraryPanel.getByPlaceholder('分组名称...').fill('Group A');
  await page.keyboard.press('Enter');
  await expect(libraryPanel.getByText('Group A')).toBeVisible();

  const groupA = libraryPanel.locator('[data-testid="library-group-Group A"]');
  await groupA.getByRole('button', { name: '添加提示词' }).click();
  
  const itemsA = groupA.locator('[data-testid^="library-item-"]');
  await expect(itemsA).toHaveCount(1);
  const prompt1Item = itemsA.last();

  const promptInput = page.getByPlaceholder('输入内容...');
  await promptInput.fill('Prompt 1');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(libraryPanel.getByText('Prompt 1')).toBeVisible();

  await groupA.getByRole('button', { name: '添加提示词' }).click();
  await expect(itemsA).toHaveCount(2);
  const prompt2Item = itemsA.last();
  
  await promptInput.fill('Prompt 2');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(libraryPanel.getByText('Prompt 2')).toBeVisible();

  await expect(itemsA.first()).toContainText('Prompt 1');
  await expect(itemsA.nth(1)).toContainText('Prompt 2');

  const handle2 = libraryPanel.locator('[data-testid^="library-item-"]', { hasText: 'Prompt 2' }).locator('[data-testid^="drag-handle-"]');
  const handle1 = libraryPanel.locator('[data-testid^="library-item-"]', { hasText: 'Prompt 1' }).locator('[data-testid^="drag-handle-"]');
  
  const box2 = await handle2.boundingBox();
  const box1 = await handle1.boundingBox();
  
  if (box2 && box1) {
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2 + 5); 
    await page.waitForTimeout(200);
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }

  await expect(itemsA.first()).toContainText('Prompt 2');
  await expect(itemsA.nth(1)).toContainText('Prompt 1');

  await page.reload();
  await expect(libraryPanel.getByText('Group A')).toBeVisible();
  
  const groupAReloaded = libraryPanel.locator('[data-testid="library-group-Group A"]');
  const itemsAReloaded = groupAReloaded.locator('[data-testid^="library-item-"]');
  
  await expect(itemsAReloaded.first()).toContainText('Prompt 2');
  await expect(itemsAReloaded.nth(1)).toContainText('Prompt 1');

  await libraryPanel.getByRole('button', { name: '新建分组' }).click();
  const newGroupInput = libraryPanel.getByPlaceholder('分组名称...');
  await expect(newGroupInput).toBeVisible();
  await newGroupInput.fill('Group B');
  await page.keyboard.press('Enter');
  await expect(libraryPanel.getByText('Group B')).toBeVisible();

  const groupB = libraryPanel.locator('[data-testid="library-group-Group B"]');
  const boxGroupB = await groupB.boundingBox();
  
  const handle2Again = itemsAReloaded.first().locator('[data-testid^="drag-handle-"]');
  const box2New = await handle2Again.boundingBox();

  if (box2New && boxGroupB) {
    await page.mouse.move(box2New.x + box2New.width / 2, box2New.y + box2New.height / 2);
    await page.mouse.down();
    await page.mouse.move(box2New.x + box2New.width / 2, box2New.y + box2New.height / 2 + 5);
    await page.waitForTimeout(200);
    await page.mouse.move(boxGroupB.x + boxGroupB.width / 2, boxGroupB.y + 20, { steps: 20 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }

  const itemsB = groupB.locator('[data-testid^="library-item-"]');
  await expect(itemsB.first()).toContainText('Prompt 2');

  await expect(itemsAReloaded).toHaveCount(1);
  await expect(itemsAReloaded.first()).toContainText('Prompt 1');

  await page.reload();
  await expect(libraryPanel.getByText('Group A')).toBeVisible();
  await expect(libraryPanel.getByText('Group B')).toBeVisible();
  
  const groupAFinal = libraryPanel.locator('[data-testid="library-group-Group A"]');
  const groupBFinal = libraryPanel.locator('[data-testid="library-group-Group B"]');
  
  await expect(groupAFinal.locator('[data-testid^="library-item-"]')).toContainText('Prompt 1');
  await expect(groupBFinal.locator('[data-testid^="library-item-"]')).toContainText('Prompt 2');

  const groupBHandle = groupBFinal.locator('[data-testid^="library-drag-handle-group-"]');
  const groupAHandle = groupAFinal.locator('[data-testid^="library-drag-handle-group-"]');
  const groupBBox = await groupBHandle.boundingBox();
  const groupABox = await groupAHandle.boundingBox();

  if (groupBBox && groupABox) {
    await page.mouse.move(groupBBox.x + groupBBox.width / 2, groupBBox.y + groupBBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(groupABox.x + groupABox.width / 2, groupABox.y + groupABox.height / 2, { steps: 12 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }

  const orderedGroups = libraryPanel.locator('[data-testid^="library-group-"]');
  await expect(orderedGroups.first()).toHaveAttribute('data-testid', 'library-group-Group B');
  await expect(orderedGroups.nth(1)).toHaveAttribute('data-testid', 'library-group-Group A');
});
