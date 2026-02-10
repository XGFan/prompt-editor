import { describe, expect, it } from 'vitest'
import {
  exportLibraryToJson,
  importLibraryFromJson,
  previewLibraryJson,
} from './libraryIo'
import { SCHEMA_VERSION, type LibraryState, type GroupId, type PromptId } from './types'
import { ValidationError } from './validate'

const pid = (value: string): PromptId => value as PromptId
const gid = (value: string): GroupId => value as GroupId

const buildLibrary = (): LibraryState => ({
  groupOrder: [gid('lib-g-1')],
  groups: {
    [gid('lib-g-1')]: {
      id: gid('lib-g-1'),
      name: 'Test Group',
      promptIds: [pid('lib-p-1')],
      collapsed: false,
    },
  },
  prompts: {
    [pid('lib-p-1')]: {
      id: pid('lib-p-1'),
      content: 'Test content',
      createdAt: '2026-02-06T15:20:00.000Z',
      updatedAt: '2026-02-06T15:20:00.000Z',
    },
  },
})

describe('libraryIo', () => {
  it('roundtrip library only', () => {
    const library = buildLibrary()
    const json = exportLibraryToJson(library)
    const imported = importLibraryFromJson(json)

    expect(imported).toEqual(library)
  })

  it('invalid JSON rejected', () => {
    expect(() => importLibraryFromJson('{ invalid }')).toThrow(ValidationError)
    expect(() => importLibraryFromJson('{ invalid }')).toThrow('invalid JSON payload')
  })

  it('unsupported schemaVersion rejected', () => {
    const invalidJson = JSON.stringify({
      schemaVersion: 999,
      library: buildLibrary(),
    })
    expect(() => importLibraryFromJson(invalidJson)).toThrow(ValidationError)
    expect(() => importLibraryFromJson(invalidJson)).toThrow('unsupported schema version')
  })

  it('duplicate group names rejected', () => {
    const library = buildLibrary()
    library.groupOrder.push(gid('lib-g-2'))
    library.groups[gid('lib-g-2')] = {
      id: gid('lib-g-2'),
      name: 'Test Group',
      promptIds: [],
      collapsed: false,
    }

    const json = exportLibraryToJson(library)
    expect(() => importLibraryFromJson(json)).toThrow(ValidationError)
    expect(() => importLibraryFromJson(json)).toThrow('has duplicate group name')
  })

  it('previewLibraryJson returns correct counts', () => {
    const library = buildLibrary()
    const json = exportLibraryToJson(library)
    const preview = previewLibraryJson(json)

    expect(preview).toEqual({
      groupCount: 1,
      promptCount: 1,
    })
  })
})
