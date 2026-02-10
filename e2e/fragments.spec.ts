import { expect, test } from '@playwright/test';

test('fragments panel interactions', async ({ page }) => {
  test.setTimeout(60000);
  page.on('console', msg => console.log(msg.text()));
  
  await page.goto('/');

  const libraryPanel = page.locator('aside').last();
  const fragmentsPanel = page.locator('aside').first();

  await libraryPanel.getByRole('button', { name: '新建分组' }).click();
  await libraryPanel.getByPlaceholder('分组名称...').fill('Lib Group');
  await page.keyboard.press('Enter');
  
  const libGroup = libraryPanel.locator('[data-testid="library-group-Lib Group"]');
  await libGroup.getByRole('button', { name: '添加提示词' }).click();
  
  const libItems = libGroup.locator('[data-testid^="library-item-"]');
  const libItem = libItems.first();
  
  const promptInput = page.getByPlaceholder('输入内容...');
  await promptInput.fill('Test Content 123');
  await page.getByRole('button', { name: '保存' }).click();
  
  await libItem.hover();
  await libItem.getByTitle('加入片段区').click();
  
  const fragmentsGroup = fragmentsPanel.locator('[data-testid="fragments-group-Lib Group"]');
  await expect(fragmentsGroup).toBeVisible();
  const fragmentsItems = fragmentsGroup.locator('[data-testid^="fragments-item-"]');
  await expect(fragmentsItems.first()).toContainText('Test Content 123');
  
  await fragmentsPanel.getByRole('button', { name: '新建分组' }).click();
  
  const newGroupInput = fragmentsPanel.locator('input[placeholder="分组名称..."]');
  await newGroupInput.fill('Frag Group B');
  await page.keyboard.press('Enter');
  
  const groupB = fragmentsPanel.locator('[data-testid="fragments-group-Frag Group B"]');
  await expect(groupB).toBeVisible();
  
  const handle = fragmentsItems.first().locator('[data-testid^="fragments-drag-handle-"]');
  const boxHandle = await handle.boundingBox();
  const boxGroupB = await groupB.boundingBox();
  
  if (boxHandle && boxGroupB) {
    console.log('Dragging from:', boxHandle);
    console.log('Dragging to:', boxGroupB);
    
    await page.mouse.move(boxHandle.x + boxHandle.width / 2, boxHandle.y + boxHandle.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxHandle.x + boxHandle.width / 2 + 10, boxHandle.y + boxHandle.height / 2 + 10, { steps: 5 });
    await page.waitForTimeout(200);
    
    // Target the center of Group B explicitly
    const targetX = boxGroupB.x + boxGroupB.width / 2;
    const targetY = boxGroupB.y + boxGroupB.height / 2;
    console.log('Target coords:', targetX, targetY);
    
    await page.mouse.move(targetX, targetY, { steps: 50 });
    await page.waitForTimeout(1000); // Wait longer for state update
    
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }
  
  const itemsB = groupB.locator('[data-testid^="fragments-item-"]');
  await expect(itemsB).toContainText('Test Content 123');
  await expect(fragmentsGroup.locator('[data-testid^="fragments-item-"]')).toHaveCount(0);
  
  await page.reload();
  
  const fragmentsPanelReloaded = page.locator('aside').first();
  const groupBReloaded = fragmentsPanelReloaded.locator('[data-testid="fragments-group-Frag Group B"]');
  await expect(groupBReloaded).toBeVisible();
  await expect(groupBReloaded.locator('[data-testid^="fragments-item-"]')).toContainText('Test Content 123');
  
  const handleB = groupBReloaded.locator('[data-testid^="fragments-group-drag-handle-"]');
  const groupLib = fragmentsPanelReloaded.locator('[data-testid="fragments-group-Lib Group"]');
  
  const boxGroupHandleB = await handleB.boundingBox();
  const boxGroupLib = await groupLib.boundingBox();
  
  if (boxGroupHandleB && boxGroupLib) {
    await page.mouse.move(boxGroupHandleB.x + boxGroupHandleB.width / 2, boxGroupHandleB.y + boxGroupHandleB.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxGroupHandleB.x + boxGroupHandleB.width / 2, boxGroupHandleB.y + boxGroupHandleB.height / 2 + 5);
    await page.waitForTimeout(200);
    await page.mouse.move(boxGroupLib.x + boxGroupLib.width / 2, boxGroupLib.y + 20, { steps: 20 });
    await page.waitForTimeout(500);
    await page.mouse.up();
  }
  
  const groups = fragmentsPanelReloaded.locator('[data-testid^="fragments-group-"]:not([data-testid*="drag-handle"])');
  await expect(groups.first()).toHaveAttribute('data-testid', 'fragments-group-Frag Group B');
  await expect(groups.nth(1)).toHaveAttribute('data-testid', 'fragments-group-Lib Group');
});
