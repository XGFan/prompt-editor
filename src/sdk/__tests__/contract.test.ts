import { describe, expect, it, vi } from 'vitest'
import type { GroupId, PromptId } from '../../domain/types'
import {
  PROMPT_EDITOR_SDK_CONTRACT_VERSION,
  type PromptEditorError,
  type PromptEditorLibrary,
  type PromptEditorSDKProps,
  type PromptEditorValue,
} from '../index'

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
      content: 'Library prompt',
      createdAt: '2026-02-09T00:00:00.000Z',
      updatedAt: '2026-02-09T00:00:00.000Z',
    },
  },
  version: '1.0.0',
  meta: { source: 'host' },
})

const buildValue = (): PromptEditorValue => ({
  fragments: {
    groupOrder: [gid('frag-group-1')],
    groups: {
      [gid('frag-group-1')]: {
        id: gid('frag-group-1'),
        name: 'Fragments Group',
        promptIds: [pid('frag-prompt-1')],
        collapsed: false,
      },
    },
    prompts: {
      [pid('frag-prompt-1')]: {
        id: pid('frag-prompt-1'),
        content: 'Fragment prompt',
        createdAt: '2026-02-09T00:00:00.000Z',
        updatedAt: '2026-02-09T00:00:00.000Z',
      },
    },
  },
  version: 1,
  meta: { scenario: 'contract-test' },
})

describe('sdk contract', () => {
  it('exports contract version and supports type imports', () => {
    const value = buildValue()

    const props: PromptEditorSDKProps = {
      value,
      initialLibrary: buildLibrary(),
      onLibraryChange: () => undefined,
      onSave: () => undefined,
      onCancel: () => undefined,
      onError: () => undefined,
    }

    const error: PromptEditorError = {
      code: 'VALIDATION_ERROR',
      message: 'library.groups["lib-group-1"].name cannot be empty',
      path: 'library.groups["lib-group-1"].name',
      meta: { reason: 'empty' },
    }

    expect(PROMPT_EDITOR_SDK_CONTRACT_VERSION).toBe(1)
    expect(props.initialLibrary.meta).toEqual({ source: 'host' })
    expect(error.path).toBe('library.groups["lib-group-1"].name')
  })

  it('supports save/cancel and library callback signatures at runtime sanity level', async () => {
    const nextLibrary = buildLibrary()
    const finalFragments = buildValue().fragments

    const onLibraryChange: PromptEditorSDKProps['onLibraryChange'] = vi.fn()
    const onSave: PromptEditorSDKProps['onSave'] = vi.fn(async (value) => ({
      ok: true,
      value,
      meta: { persistedBy: 'host' },
    }))
    const onCancel: PromptEditorSDKProps['onCancel'] = vi.fn()

    onLibraryChange?.(nextLibrary)
    const saveResult = await onSave(finalFragments)
    onCancel()

    expect(onLibraryChange).toHaveBeenCalledWith(nextLibrary)
    expect(onSave).toHaveBeenCalledWith(finalFragments)
    expect(saveResult).toEqual({
      ok: true,
      value: finalFragments,
      meta: { persistedBy: 'host' },
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
