import { describe, expect, it } from 'vitest'

import { exportAppStateJson, importAppStateJson } from './storage'
import { SCHEMA_VERSION, type AppState, type GroupId, type PromptId } from './types'

const pid = (value: string): PromptId => value as PromptId
const gid = (value: string): GroupId => value as GroupId

const buildState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  library: {
    groupOrder: [gid('lib-g-1'), gid('lib-g-2')],
    groups: {
      [gid('lib-g-1')]: {
        id: gid('lib-g-1'),
        name: 'System Prompts',
        promptIds: [pid('lib-p-1')],
        collapsed: false,
      },
      [gid('lib-g-2')]: {
        id: gid('lib-g-2'),
        name: 'Templates',
        promptIds: [pid('lib-p-2'), pid('lib-p-3')],
        collapsed: true,
      },
    },
    prompts: {
      [pid('lib-p-1')]: {
        id: pid('lib-p-1'),
        content: 'Summarize in 5 bullets.',
        createdAt: '2026-02-06T15:20:00.000Z',
        updatedAt: '2026-02-06T15:20:00.000Z',
      },
      [pid('lib-p-2')]: {
        id: pid('lib-p-2'),
        content: 'Keep formal tone.',
        createdAt: '2026-02-06T15:21:00.000Z',
        updatedAt: '2026-02-06T15:21:00.000Z',
      },
      [pid('lib-p-3')]: {
        id: pid('lib-p-3'),
        content: 'Focus on correctness and readability.',
        createdAt: '2026-02-06T15:22:00.000Z',
        updatedAt: '2026-02-06T15:22:00.000Z',
      },
    },
  },
  fragments: {
    groupOrder: [gid('frag-g-1')],
    groups: {
      [gid('frag-g-1')]: {
        id: gid('frag-g-1'),
        name: 'Snippets',
        promptIds: [pid('frag-p-1')],
        collapsed: false,
      },
    },
    prompts: {
      [pid('frag-p-1')]: {
        id: pid('frag-p-1'),
        content: 'Start your free trial today.',
        createdAt: '2026-02-06T15:23:00.000Z',
        updatedAt: '2026-02-06T15:23:00.000Z',
      },
    },
  },
  savedPrompts: {
    order: [],
    items: {},
  },
  ui: {
    panels: {
      libraryCollapsed: false,
      fragmentsCollapsed: true,
    },
    columnWidths: {
      library: 420,
      fragments: 360,
    },
    activeLibraryGroupId: null,
  },
})

describe('domain serialization', () => {
  it('roundtrip importJson(exportJson(state)) keeps key fields consistent', () => {
    const state = buildState()

    const encoded = exportAppStateJson(state)
    const decoded = importAppStateJson(encoded)

    expect(decoded.schemaVersion).toBe(SCHEMA_VERSION)
    expect(decoded.library.groupOrder).toEqual(state.library.groupOrder)
    expect(decoded.library.groups).toEqual(state.library.groups)
    expect(decoded.library.prompts).toEqual(state.library.prompts)
    expect(decoded.fragments.groupOrder).toEqual(state.fragments.groupOrder)
    expect(decoded.fragments.groups).toEqual(state.fragments.groups)
    expect(decoded.fragments.prompts).toEqual(state.fragments.prompts)
    expect(decoded.ui).toEqual(state.ui)
    expect(decoded.savedPrompts).toEqual(state.savedPrompts)
  })

  it('handles missing savedPrompts for compatibility with schemaVersion=1', () => {
    const state = buildState()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = JSON.parse(JSON.stringify(state)) as any
    delete raw.savedPrompts

    const encoded = JSON.stringify(raw)
    const decoded = importAppStateJson(encoded)

    expect(decoded.savedPrompts).toEqual({ order: [], items: {} })
  })

  it('rejects invalid JSON and does not mutate existing objects', () => {
    const state = buildState()
    const snapshot = structuredClone(state)

    expect(() => importAppStateJson('{invalid json')).toThrowError('invalid JSON payload')
    expect(state).toEqual(snapshot)
  })
})
