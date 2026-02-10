import { expect, test } from '@playwright/test'

test('saved prompts functionality', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('tab', { name: '成品库' }).click()
  
  await expect(page.getByTestId('saved-prompts-empty')).toBeVisible()
  
  await page.getByPlaceholder('成品名称...').fill('My First Prompt')
  await page.getByPlaceholder('标签 (逗号分隔)').fill('tag1, tag2')
  await page.getByTestId('saved-prompts-save').click()
  
  await expect(page.getByText('My First Prompt')).toBeVisible()

  const item1 = page.locator('div[data-testid^="saved-prompts-item-"]').filter({ hasText: 'My First Prompt' })
  await expect(item1.getByText('tag1')).toBeVisible()
  await expect(item1.getByText('tag2')).toBeVisible()
  await expect(page.getByTestId('saved-prompts-empty')).not.toBeVisible()

  await page.getByPlaceholder('成品名称...').fill('Second Prompt')
  await page.getByPlaceholder('标签 (逗号分隔)').fill('tag2, tag3')
  await page.getByTestId('saved-prompts-save').click()

  await page.getByTestId('saved-prompts-search').fill('First')
  await expect(page.getByText('My First Prompt')).toBeVisible()
  await expect(page.getByText('Second Prompt')).not.toBeVisible()
  await page.getByTestId('saved-prompts-search').clear()

  await page.getByTestId('saved-prompts-search').fill('tag3')
  await expect(page.getByText('My First Prompt')).not.toBeVisible()
  await expect(page.getByText('Second Prompt')).toBeVisible()
  await page.getByTestId('saved-prompts-search').clear()

  await page.getByTestId('saved-prompts-tag-tag1').click()
  await expect(page.getByText('My First Prompt')).toBeVisible()
  await expect(page.getByText('Second Prompt')).not.toBeVisible()

  await page.getByTestId('saved-prompts-tag-tag3').click()
  await expect(page.getByText('My First Prompt')).toBeVisible()
  await expect(page.getByText('Second Prompt')).toBeVisible()

  await page.getByTestId('saved-prompts-tag-tag1').click()
  await expect(page.getByText('My First Prompt')).not.toBeVisible()
  await expect(page.getByText('Second Prompt')).toBeVisible()

  await page.getByTestId('saved-prompts-tag-tag3').click()
  await expect(page.getByText('My First Prompt')).toBeVisible()
  await expect(page.getByText('Second Prompt')).toBeVisible()
  
  await page.getByText('My First Prompt').click()
  await page.getByPlaceholder('输入名称').fill('Renamed Prompt')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Renamed Prompt')).toBeVisible()
  
  const item = page.locator('div[data-testid^="saved-prompts-item-"]').filter({ hasText: 'Renamed Prompt' })
  await item.hover()
  
  const deleteBtn = item.getByTitle('删除')
  await deleteBtn.click()
  
  await expect(item.getByText('确认删除')).toBeVisible()
  await item.getByText('确认删除').click()
  
  await expect(page.getByText('Renamed Prompt')).not.toBeVisible()
})

test('error handling for duplicate names', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: '成品库' }).click()

  // Save first
  await page.getByPlaceholder('成品名称...').fill('Duplicate Test')
  await page.getByTestId('saved-prompts-save').click()
  await expect(page.getByText('Duplicate Test')).toBeVisible()

  // Save duplicate
  await page.getByPlaceholder('成品名称...').fill('Duplicate Test')
  await page.getByTestId('saved-prompts-save').click()
  await expect(page.getByText('saved prompts has duplicate name: Duplicate Test')).toBeVisible()

  // Rename to duplicate
  await page.getByPlaceholder('成品名称...').fill('Another One')
  await page.getByTestId('saved-prompts-save').click()
  await expect(page.getByText('Another One')).toBeVisible()

  await page.getByText('Another One').click()
  await page.getByPlaceholder('输入名称').fill('Duplicate Test')
  await page.keyboard.press('Enter')
  await expect(page.getByText('saved prompts has duplicate name: Duplicate Test')).toBeVisible()
})

test('deletion confirmation interactions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: '成品库' }).click()

  await page.getByPlaceholder('成品名称...').fill('Delete Confirm Test')
  await page.getByTestId('saved-prompts-save').click()
  const item = page.locator('div[data-testid^="saved-prompts-item-"]').filter({ hasText: 'Delete Confirm Test' })
  
  await item.hover()
  const deleteBtn = item.getByTestId(/^saved-prompts-delete-/)
  
  // Timeout test
  await deleteBtn.click()
  await expect(item.getByText('确认删除')).toBeVisible()
  await page.waitForTimeout(3500)
  await expect(item.getByText('确认删除')).not.toBeVisible()

  // Esc cancellation test
  await deleteBtn.click()
  await expect(item.getByText('确认删除')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(item.getByText('确认删除')).not.toBeVisible()

  // Actual delete
  await deleteBtn.click()
  await item.getByText('确认删除').click()
  await expect(item).not.toBeVisible()
})

test('persistence and load closed loop', async ({ page }) => {
  await page.goto('/')

  await page.getByText('新建分组').first().click()
  await page.getByPlaceholder('分组名称...').fill('Group A')
  await page.keyboard.press('Enter')
  
  const groupA = page.getByTestId('fragments-group-Group A')
  await groupA.getByTitle('添加提示词').click()
  
  await page.getByPlaceholder('输入内容...').fill('Fragment Content A')
  await page.getByTitle('保存').last().click()
  
  await expect(page.getByTestId('prompt-text')).toHaveText(/##Group A\s+Fragment Content A;/)

  await page.getByRole('tab', { name: '成品库' }).click()
  await page.getByPlaceholder('成品名称...').fill('Saved Prompt A')
  await page.getByTestId('saved-prompts-save').click()
  await expect(page.getByText('Saved Prompt A')).toBeVisible()

  const itemToDelete = page.getByTestId(/^fragments-item-/)
  await itemToDelete.hover()
  await itemToDelete.getByTitle('删除').click()
  await itemToDelete.getByText('确认删除').click()
  await expect(page.getByTestId('prompt-text-empty')).toBeVisible()

  const savedItemA = page.locator('div[data-testid^="saved-prompts-item-"]').filter({ hasText: 'Saved Prompt A' })
  await savedItemA.hover()
  await savedItemA.getByTestId(/^saved-prompts-load-/).click()

  await expect(page.getByTestId('prompt-text')).toHaveText(/##Group A\s+Fragment Content A;/)

  await page.reload()
  await expect(page.getByTestId('prompt-text')).toHaveText(/##Group A\s+Fragment Content A;/)
  
  await page.getByRole('tab', { name: '成品库' }).click()
  await expect(page.getByText('Saved Prompt A')).toBeVisible()
})
