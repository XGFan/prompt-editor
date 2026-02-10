import { expect, test } from '@playwright/test';

test('Large dataset interaction benchmark', async ({ page }) => {
  test.setTimeout(60000);

  const generateData = () => {
    const groupCount = 50;
    const promptsPerGroup = 10;
    const state: any = {
      schemaVersion: 1,
      library: {
        groupOrder: [],
        groups: {},
        prompts: {},
      },
      fragments: {
        groupOrder: [],
        groups: {},
        prompts: {},
      },
      ui: {
        panels: { libraryCollapsed: false, fragmentsCollapsed: false },
        columnWidths: { library: 300, fragments: 300 },
      },
    };

    for (let i = 1; i <= groupCount; i++) {
      const groupId = `group-${i}`;
      const groupName = `Group ${i}`;
      state.library.groupOrder.push(groupId);
      state.library.groups[groupId] = {
        id: groupId,
        name: groupName,
        promptIds: [],
        collapsed: false,
      };

      for (let j = 1; j <= promptsPerGroup; j++) {
        const promptId = `prompt-${i}-${j}`;
        state.library.groups[groupId].promptIds.push(promptId);
        state.library.prompts[promptId] = {
          id: promptId,
          content: `Content for P-${i}-${j}. ${i === 1 ? 'SearchTarget' : 'NoiseData'}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return state;
  };

  const data = generateData();

  await page.addInitScript((state) => {
    localStorage.setItem('llm_prompt_panel_state', JSON.stringify(state));
  }, data);

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`Page Error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByText('Group 50')).toBeVisible();

  const searchInput = page.getByPlaceholder('搜索提示词...');
  await searchInput.fill('SearchTarget');
  
  await expect(page.getByText('Group 1')).toBeVisible();
  await expect(page.getByText('Group 2')).not.toBeVisible();

  const group1 = page.locator('[data-testid="library-group-Group 1"]');
  const items = group1.locator('[data-testid^="library-item-"]');
  
  await expect(items).toHaveCount(10);
  
  const item1 = items.nth(0);
  const item2 = items.nth(1);
  
  const text1Before = await item1.innerText();

  const handle1 = item1.locator('[data-testid^="drag-handle-"]');
  const handle2 = item2.locator('[data-testid^="drag-handle-"]');

  const box1 = await handle1.boundingBox();
  const box2 = await handle2.boundingBox();

  expect(box1).not.toBeNull();
  expect(box2).not.toBeNull();

  if (box1 && box2) {
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
    await page.mouse.down();
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2 + 5);
    await page.waitForTimeout(200); 
    
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 10 });
    await page.waitForTimeout(200);
    
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }

  expect(errors).toEqual([]);

  const text1After = await items.nth(0).innerText();
  expect(text1After).not.toBe(text1Before);
  
  await expect(items).toHaveCount(10);
});
