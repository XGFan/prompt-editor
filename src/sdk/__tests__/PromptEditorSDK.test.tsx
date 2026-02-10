import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { GroupId, PromptId } from '../../domain/types'
import { PromptEditorSDK } from '../PromptEditorSDK'
import type { PromptEditorError, PromptEditorLibrary, PromptEditorSDKHandle, PromptEditorValue } from '../types'

const gid = (value: string): GroupId => value as GroupId
const pid = (value: string): PromptId => value as PromptId

const buildLibrary = (): PromptEditorLibrary => ({
  groupOrder: [gid('lib-group-1')],
  groups: {
    [gid('lib-group-1')]: {
      id: gid('lib-group-1'),
      name: 'Library Group',
      promptIds: [pid('lib-prompt-1')],
      collapsed: false,
    },
  },
  prompts: {
    [pid('lib-prompt-1')]: {
      id: pid('lib-prompt-1'),
      content: 'Library prompt before edit',
      createdAt: '2026-02-09T00:00:00.000Z',
      updatedAt: '2026-02-09T00:00:00.000Z',
    },
  },
})

const buildValue = (): PromptEditorValue => ({
  fragments: {
    groupOrder: [gid('lib-group-1')],
    groups: {
      [gid('lib-group-1')]: {
        id: gid('lib-group-1'),
        name: 'Library Group',
        promptIds: [pid('lib-prompt-1')],
        collapsed: false,
      },
    },
    prompts: {
      [pid('lib-prompt-1')]: {
        id: pid('lib-prompt-1'),
        content: 'Library prompt before edit',
        createdAt: '2026-02-09T00:00:00.000Z',
        updatedAt: '2026-02-09T00:00:00.000Z',
      },
    },
  },
})

describe('PromptEditorSDK', () => {
  it('编辑 fragments 后，requestSave 返回最新 fragments 且不触发 onLibraryChange', async () => {
    const onLibraryChangeSpy = vi.fn()
    const sdkRef = createRef<PromptEditorSDKHandle>()

    function Host() {
      const [value] = useState<PromptEditorValue>(buildValue())

      return (
        <PromptEditorSDK
          ref={sdkRef}
          value={value}
          initialLibrary={buildLibrary()}
          onLibraryChange={onLibraryChangeSpy}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      )
    }

    render(<Host />)

    const fragmentsPanel = screen.getByTestId('panel-fragments')
    const fragmentsScope = within(fragmentsPanel)

    fireEvent.click(fragmentsScope.getAllByTitle('编辑')[0])
    fireEvent.change(fragmentsScope.getByPlaceholderText('输入内容...'), {
      target: { value: 'Edited library prompt' },
    })
    fireEvent.click(fragmentsScope.getByTitle('保存'))

    let result: Awaited<ReturnType<PromptEditorSDKHandle['requestSave']>> | undefined
    await act(async () => {
      result = await sdkRef.current?.requestSave()
    })

    expect(result?.ok).toBe(true)
    if (result?.ok) {
      expect(result.value.prompts[pid('lib-prompt-1')]?.content).toBe('Edited library prompt')
    }
    expect(onLibraryChangeSpy).not.toHaveBeenCalled()
  })

  it('编辑 library 时通过 onLibraryChange 单独回传', async () => {
    const onLibraryChange = vi.fn()

    render(
      <PromptEditorSDK
        value={buildValue()}
        initialLibrary={buildLibrary()}
        onLibraryChange={onLibraryChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const libraryPanel = screen.getByTestId('panel-library')
    const libraryScope = within(libraryPanel)

    fireEvent.click(libraryScope.getAllByTitle('编辑')[0])
    fireEvent.change(libraryScope.getByPlaceholderText('输入内容...'), {
      target: { value: 'Edited library prompt' },
    })
    fireEvent.click(libraryScope.getByTitle('保存'))

    await waitFor(() => {
      expect(onLibraryChange).toHaveBeenCalled()
    })

    const lastCall = onLibraryChange.mock.calls.at(-1)
    expect(lastCall?.[0].prompts[pid('lib-prompt-1')]?.content).toBe('Edited library prompt')
  })

  it('requestSave 校验通过时触发 onSave 并返回 ok:true', async () => {
    const onSave = vi.fn(async () => undefined)
    const sdkRef = createRef<PromptEditorSDKHandle>()

    render(
      <PromptEditorSDK
        ref={sdkRef}
        value={buildValue()}
        initialLibrary={buildLibrary()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    let result: Awaited<ReturnType<PromptEditorSDKHandle['requestSave']>> | undefined
    await act(async () => {
      result = await sdkRef.current?.requestSave()
    })

    expect(result?.ok).toBe(true)
    if (result?.ok) {
      expect(result.value.prompts[pid('lib-prompt-1')]?.content).toBe('Library prompt before edit')
    }
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('requestSave 在宿主扩展校验失败时返回 ok:false 且不调用 onSave', async () => {
    const onSave = vi.fn()
    const onError = vi.fn()
    const sdkRef = createRef<PromptEditorSDKHandle>()
    const hostError: PromptEditorError = {
      code: 'HOST_BLOCK_SAVE',
      message: 'blocked by host rule',
      severity: 'error',
    }

    render(
      <PromptEditorSDK
        ref={sdkRef}
        value={buildValue()}
        initialLibrary={buildLibrary()}
        onSave={onSave}
        onCancel={vi.fn()}
        onError={onError}
        validate={async () => [hostError]}
      />,
    )

    let result: Awaited<ReturnType<PromptEditorSDKHandle['requestSave']>> | undefined
    await act(async () => {
      result = await sdkRef.current?.requestSave()
    })

    expect(result?.ok).toBe(false)
    if (result?.ok === false) {
      expect(result.error.code).toBe('HOST_BLOCK_SAVE')
      expect(result.errors?.[0]?.source).toBe('host')
    }
    expect(onSave).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('requestCancel 会触发 onCancel', () => {
    const onCancel = vi.fn()

    function Host() {
      const ref = useRef<PromptEditorSDKHandle>(null)
      return (
        <>
          <button
            onClick={() => {
              ref.current?.requestCancel()
            }}
          >
            trigger-cancel
          </button>
          <PromptEditorSDK
            ref={ref}
            value={buildValue()}
            initialLibrary={buildLibrary()}
            onSave={vi.fn()}
            onCancel={onCancel}
          />
        </>
      )
    }

    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'trigger-cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('readOnly=true 时不允许保存且不会触发 onSave', async () => {
    const onSave = vi.fn()
    const onError = vi.fn()
    const sdkRef = createRef<PromptEditorSDKHandle>()

    render(
      <PromptEditorSDK
        ref={sdkRef}
        readOnly
        value={buildValue()}
        initialLibrary={buildLibrary()}
        onSave={onSave}
        onCancel={vi.fn()}
        onError={onError}
      />,
    )

    const createButtons = screen.queryAllByText('新建分组')
    expect(createButtons).toHaveLength(0)
    expect(screen.queryAllByTitle('编辑')).toHaveLength(0)

    let result: Awaited<ReturnType<PromptEditorSDKHandle['requestSave']>> | undefined
    await act(async () => {
      result = await sdkRef.current?.requestSave()
    })

    expect(result?.ok).toBe(false)
    if (result && result.ok === false) {
      expect(result.error.code).toBe('SDK_READ_ONLY')
    }
    expect(onSave).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
