import { expect, test, type Page } from '@playwright/test'

const SDK_DEMO_URL = '/?sdkDemo=1'

async function openEditor(page: Page) {
  await page.getByTestId('host-open-editor').click()
  await expect(page.getByTestId('sdk-editor-root')).toBeVisible()
}

async function editFirstPrompt(page: Page, content: string) {
  await page.getByTitle('编辑').first().click()
  await page.getByPlaceholder('输入内容...').fill(content)
  await page.getByTitle('保存').click()
}

test.describe('sdk embed host demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SDK_DEMO_URL)
    await expect(page.getByTestId('host-open-editor')).toBeVisible()
    await expect(page.getByTestId('host-latest-prompt')).toContainText('Summarize this week updates and risks.')
  })

  test('open → edit → save 会更新 host-latest-prompt', async ({ page }) => {
    await openEditor(page)
    await editFirstPrompt(page, 'E2E save path updated content')

    await page.getByTestId('host-save').click()

    await expect(page.getByTestId('host-latest-prompt')).toContainText('E2E save path updated content')
    await expect(page.getByTestId('sdk-editor-root')).not.toBeVisible()

    await page.screenshot({ path: '.sisyphus/evidence/sdk-embed-save.png', fullPage: true })
  })

  test('open → edit → cancel 不会更新 host-latest-prompt', async ({ page }) => {
    await openEditor(page)
    await editFirstPrompt(page, 'E2E cancel path should not persist')

    await page.getByTestId('host-cancel').click()

    await expect(page.getByTestId('host-latest-prompt')).toContainText('Summarize this week updates and risks.')
    await expect(page.getByTestId('host-latest-prompt')).not.toContainText('E2E cancel path should not persist')
    await expect(page.getByTestId('sdk-editor-root')).not.toBeVisible()

    await page.screenshot({ path: '.sisyphus/evidence/sdk-embed-cancel.png', fullPage: true })
  })

  test('open → edit with [BLOCK_SAVE] → save 显示 host-error 且对话框保持打开', async ({ page }) => {
    await openEditor(page)
    await editFirstPrompt(page, '[BLOCK_SAVE] e2e blocked content')

    await page.getByTestId('host-save').click()

    await expect(page.getByTestId('host-error')).toContainText('检测到宿主拦截标记 [BLOCK_SAVE]，禁止提交')
    await expect(page.getByTestId('host-latest-prompt')).toContainText('Summarize this week updates and risks.')
    await expect(page.getByTestId('sdk-editor-root')).toBeVisible()

    await page.screenshot({ path: '.sisyphus/evidence/sdk-embed-block.png', fullPage: true })
  })
})
