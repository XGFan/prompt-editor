import { useMemo, useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { buildPromptText } from '../../components/promptText/buildPromptText'
import { PromptEditorSDK } from '../PromptEditorSDK'
import type { PromptEditorError, PromptEditorLibrary, PromptEditorSDKHandle, PromptEditorValue } from '../types'
import { createHostSdkDemoInitialLibrary, createHostSdkDemoInitialValue } from './fixtures'

const initialValue = createHostSdkDemoInitialValue()
const initialLibrary = createHostSdkDemoInitialLibrary()

export function HostSdkIntegrationDemo() {
  const sdkRef = useRef<PromptEditorSDKHandle>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [value, setValue] = useState<PromptEditorValue>(initialValue)
  const [latestValue, setLatestValue] = useState<PromptEditorValue>(initialValue)
  const [library, setLibrary] = useState<PromptEditorLibrary>(initialLibrary)
  const [latestLibrary, setLatestLibrary] = useState<PromptEditorLibrary>(initialLibrary)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const latestPromptText = useMemo(() => {
    const prompt = buildPromptText(latestValue.fragments).trim()
    return prompt.length > 0 ? prompt : JSON.stringify(latestValue.fragments, null, 2)
  }, [latestValue])

  const openEditor = () => {
    setValue(latestValue)
    setLibrary(latestLibrary)
    setErrorMessage('')
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setErrorMessage('')
    setValue(latestValue)
    setLibrary(latestLibrary)
  }

  const handleSave = async () => {
    const saveResult = await sdkRef.current?.requestSave()
    if (!saveResult) {
      return
    }

    if (saveResult.ok) {
      setLatestValue(saveResult.value)
      setValue(saveResult.value)
      setLatestLibrary(library)
      setErrorMessage('')
      setDialogOpen(false)
      return
    }

    setErrorMessage(saveResult.error.message)
  }

  const handleCancel = () => {
    sdkRef.current?.requestCancel()
  }

  const handleSdkCancel = () => {
    setDialogOpen(false)
    setErrorMessage('')
    setValue(latestValue)
    setLibrary(latestLibrary)
  }

  const handleSdkError = (error: PromptEditorError) => {
    setErrorMessage(error.message)
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-8" data-testid="host-sdk-demo">
      <div className="mx-auto max-w-6xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">宿主集成适配示例</h1>
            <p className="text-sm text-gray-600">宿主负责弹窗与操作按钮，SDK 仅负责编辑与回传。</p>
          </div>
          <Button data-testid="host-open-editor" onClick={openEditor}>
            打开编辑器
          </Button>
        </div>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">最新结果展示（宿主保存后提交）</h2>
          <pre
            data-testid="host-latest-prompt"
            className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-3 text-xs leading-6 text-gray-800"
          >
            {latestPromptText}
          </pre>
        </section>
      </div>

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        title="宿主编辑弹窗"
        description="保存/取消由宿主按钮触发，SDK 仅暴露 requestSave/requestCancel。"
        width="lg"
        footer={
          <>
            <Button variant="ghost" data-testid="host-cancel" onClick={handleCancel}>
              取消
            </Button>
            <Button data-testid="host-save" onClick={handleSave}>
              保存
            </Button>
          </>
        }
      >
        <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-lg border border-gray-200">
            <PromptEditorSDK
              ref={sdkRef}
              value={value}
              initialLibrary={library}
              onLibraryChange={setLibrary}
              onSave={async (finalValue) => ({ ok: true, value: finalValue })}
            onCancel={handleSdkCancel}
            onError={handleSdkError}
            validate={(nextValue) => {
              const prompt = buildPromptText(nextValue.fragments).trim()
              if (prompt.includes('[BLOCK_SAVE]')) {
                return [
                  {
                    code: 'HOST_BLOCKED_TOKEN',
                    message: '检测到宿主拦截标记 [BLOCK_SAVE]，禁止提交',
                    severity: 'error',
                    path: 'value.fragments',
                  },
                ]
              }
              if (prompt.length > 0) {
                return []
              }
              return [
                {
                  code: 'HOST_EMPTY_PROMPT',
                  message: '至少需要一个非空片段后才能保存',
                  severity: 'error',
                  path: 'value.fragments',
                },
              ]
            }}
          />
        </div>
        {errorMessage ? (
          <p data-testid="host-error" className="mt-3 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
      </Dialog>
    </div>
  )
}
