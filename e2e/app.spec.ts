import { expect, test } from '@playwright/test'

test('loads library panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('搜索提示词...')).toBeVisible()
})
