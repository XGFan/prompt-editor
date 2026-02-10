import { describe, expect, it, vi } from 'vitest'

import type { GroupId, PromptCollectionState, PromptId } from '../../domain/types'
import { SDK_VALIDATION_ERROR_CODES } from '../errors'
import type { PromptEditorError, PromptEditorLibrary, PromptEditorValidationInput, PromptEditorValue } from '../types'
import {
  canSaveWithErrors,
  validatePromptEditorBeforeSave,
  validatePromptEditorValue,
} from '../validation'

const pid = (value: string): PromptId => value as PromptId
const gid = (value: string): GroupId => value as GroupId

const buildCollection = (prefix: string, groupName: string): PromptCollectionState => {
  const groupId = gid(`${prefix}-g-1`)
  const promptId = pid(`${prefix}-p-1`)

  return {
    groupOrder: [groupId],
    groups: {
      [groupId]: {
        id: groupId,
        name: groupName,
        promptIds: [promptId],
        collapsed: false,
      },
    },
    prompts: {
      [promptId]: {
        id: promptId,
        content: `${prefix} content`,
        createdAt: '2026-02-09T10:00:00.000Z',
        updatedAt: '2026-02-09T10:00:00.000Z',
      },
    },
  }
}

const buildLibrary = (): PromptEditorLibrary =>
  buildCollection('lib', 'Library Group') as PromptEditorLibrary

const buildValue = (): PromptEditorValue => ({
  fragments: buildCollection('frag', 'Fragment Group'),
})

const buildValidationInput = (): PromptEditorValidationInput => ({
  ...buildValue(),
  library: buildLibrary(),
})

describe('sdk validation', () => {
  it('returns empty sdk errors for a valid value', () => {
    const value = buildValue()
    expect(validatePromptEditorValue(value)).toEqual([])
  })

  it('reports malformed structure with stable code/path', () => {
    const malformed = {
      fragments: {
        groupOrder: ['frag-g-1'],
        groups: {
          'frag-g-1': {
            id: 'frag-g-1',
            name: 'Fragment Group',
            promptIds: ['frag-p-1'],
            collapsed: false,
          },
        },
        prompts: {
          'frag-p-1': {
            id: 'frag-p-1',
            content: 123,
            createdAt: '2026-02-09T10:00:00.000Z',
            updatedAt: '2026-02-09T10:00:00.000Z',
          },
        },
      },
    }

    const errors = validatePromptEditorValue(malformed)
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT,
          path: 'value.fragments.prompts["frag-p-1"].content',
          source: 'sdk',
        }),
      ]),
    )
  })

  it('rejects duplicate group names within a collection', () => {
    const value = buildValue()
    value.fragments.groupOrder.push(gid('frag-g-2'))
    value.fragments.groups[gid('frag-g-2')] = {
      id: gid('frag-g-2'),
      name: 'Fragment Group',
      promptIds: [],
      collapsed: false,
    }

    const errors = validatePromptEditorValue(value)
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: SDK_VALIDATION_ERROR_CODES.DUPLICATE_GROUP_NAME,
          source: 'sdk',
        }),
      ]),
    )
  })

  it('save gate blocks on sdk errors and skips host validation', async () => {
    const hostValidate = vi.fn((): PromptEditorError[] => [])
    const result = await validatePromptEditorBeforeSave({ invalid: true }, hostValidate)

    expect(hostValidate).not.toHaveBeenCalled()
    expect(result.canSave).toBe(false)
    expect(result.value).toBeUndefined()
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: SDK_VALIDATION_ERROR_CODES.INVALID_COLLECTION,
        source: 'sdk',
      }),
    )
  })

  it('save gate blocks on host sync validation errors', async () => {
    const value = buildValidationInput()
    const hostValidate = vi.fn((): PromptEditorError[] => [
      {
        code: 'HOST_RULE',
        message: 'host says no',
        path: 'value.fragments',
        source: 'host',
      },
    ])

    const result = await validatePromptEditorBeforeSave(value, hostValidate)

    expect(hostValidate).toHaveBeenCalledOnce()
    expect(result.canSave).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'HOST_RULE',
          source: 'host',
          severity: 'error',
        }),
      ]),
    )
  })

  it('supports async host validation', async () => {
    const value = buildValidationInput()
    const result = await validatePromptEditorBeforeSave(value, async () => [
      {
        code: 'HOST_ASYNC',
        message: 'async host rejection',
        source: 'host',
      },
    ])

    expect(result.canSave).toBe(false)
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: 'HOST_ASYNC',
        source: 'host',
      }),
    )
  })

  it('allows save when only warning exists', () => {
    expect(
      canSaveWithErrors([
        {
          code: 'HOST_WARNING',
          message: 'just a warning',
          severity: 'warning',
          source: 'host',
        },
      ]),
    ).toBe(true)
  })
})
