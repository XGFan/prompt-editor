import { test, expect } from '@playwright/test';

test.describe('Splitter Functionality', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should resize panels and persist widths', async ({ page }) => {
    const fragmentsPanel = page.getByTestId('panel-fragments');
    const initialBox = await fragmentsPanel.boundingBox();
    if (!initialBox) throw new Error('Fragments panel not found');
    const initialWidth = initialBox.width;

    const leftSplitter = page.getByTestId('splitter-left');
    const splitterBox = await leftSplitter.boundingBox();
    if (!splitterBox) throw new Error('Left splitter not found');

    const startX = splitterBox.x + splitterBox.width / 2;
    const startY = splitterBox.y + splitterBox.height / 2;
    const dragDistance = 50;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + dragDistance, startY);
    await page.mouse.up();

    await expect(async () => {
      const newBox = await fragmentsPanel.boundingBox();
      expect(newBox?.width).toBeGreaterThan(initialWidth + dragDistance - 5);
      expect(newBox?.width).toBeLessThan(initialWidth + dragDistance + 5);
    }).toPass();

    const resizedBox = await fragmentsPanel.boundingBox();
    if (!resizedBox) throw new Error('Fragments panel not found');
    const resizedWidth = resizedBox.width;

    await page.reload();
    await expect(fragmentsPanel).toBeVisible();
    
    const reloadedBox = await fragmentsPanel.boundingBox();
    if (!reloadedBox) throw new Error('Fragments panel not found after reload');
    
    expect(Math.abs(reloadedBox.width - resizedWidth)).toBeLessThan(2);

    const reloadedSplitter = page.getByTestId('splitter-left');
    const reloadedSplitterBox = await reloadedSplitter.boundingBox();
    if (!reloadedSplitterBox) throw new Error('Splitter not found after reload');
    
    await page.mouse.dblclick(
        reloadedSplitterBox.x + reloadedSplitterBox.width / 2, 
        reloadedSplitterBox.y + reloadedSplitterBox.height / 2
    );

    await expect(async () => {
      const resetBox = await fragmentsPanel.boundingBox();
      expect(resetBox?.width).not.toBeCloseTo(resizedWidth, 1);
    }).toPass();
  });

  test('should respect minimum widths', async ({ page }) => {
     const fragmentsPanel = page.getByTestId('panel-fragments');
     const leftSplitter = page.getByTestId('splitter-left');
     
     const splitterBox = await leftSplitter.boundingBox();
     if (!splitterBox) throw new Error('Left splitter not found');

     const startX = splitterBox.x + splitterBox.width / 2;
     const startY = splitterBox.y + splitterBox.height / 2;
     
     await page.mouse.move(startX, startY);
     await page.mouse.down();
     await page.mouse.move(0, startY);
     await page.mouse.up();

     const minBox = await fragmentsPanel.boundingBox();
     expect(minBox?.width).toBeGreaterThanOrEqual(360);
  });
});
