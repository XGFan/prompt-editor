import { SCHEMA_VERSION, type AppState, type GroupId, type PromptId, type SavedPromptId, type SessionUiState } from '../domain/types'
import type { ActionContext, AreaKey } from './actions'

export const pid = (value: string): PromptId => value as PromptId
export const gid = (value: string): GroupId => value as GroupId
export const spid = (value: string): SavedPromptId => value as SavedPromptId

export const buildSessionUi = (): SessionUiState => ({
  expandedPromptIds: [],
})

export const buildBaseState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  library: {
    groupOrder: [gid('lib-g-1'), gid('lib-g-2')],
    groups: {
      [gid('lib-g-1')]: {
        id: gid('lib-g-1'),
        name: 'System',
        promptIds: [pid('lib-p-1')],
        collapsed: false,
      },
      [gid('lib-g-2')]: {
        id: gid('lib-g-2'),
        name: 'Marketing',
        promptIds: [],
        collapsed: false,
      },
    },
    prompts: {
      [pid('lib-p-1')]: {
        id: pid('lib-p-1'),
        content: 'Summarize in 3 bullets.',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
      },
    },
  },
  fragments: {
    groupOrder: [gid('frag-g-1')],
    groups: {
      [gid('frag-g-1')]: {
        id: gid('frag-g-1'),
        name: 'System',
        promptIds: [pid('frag-p-1')],
        collapsed: false,
      },
    },
    prompts: {
      [pid('frag-p-1')]: {
        id: pid('frag-p-1'),
        content: 'Existing fragment content.',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
      },
    },
  },
  savedPrompts: {
    order: [spid('saved-1')],
    items: {
      [spid('saved-1')]: {
        id: spid('saved-1'),
        name: 'Starter Fragments',
        tags: ['weekly', 'summary'],
        snapshot: {
          groupOrder: [gid('saved-frag-g-1')],
          groups: {
            [gid('saved-frag-g-1')]: {
              id: gid('saved-frag-g-1'),
              name: 'Saved Group',
              promptIds: [pid('saved-frag-p-1')],
              collapsed: false,
            },
          },
          prompts: {
            [pid('saved-frag-p-1')]: {
              id: pid('saved-frag-p-1'),
              content: 'Saved fragment content.',
              createdAt: '2026-02-06T00:00:00.000Z',
              updatedAt: '2026-02-06T00:00:00.000Z',
            },
          },
        },
        createdAt: '2026-02-06T00:00:00.000Z',
        updatedAt: '2026-02-06T00:00:00.000Z',
      },
    },
  },
  ui: {
    panels: {
      libraryCollapsed: false,
      fragmentsCollapsed: false,
    },
    columnWidths: {
      library: 420,
      fragments: 600,
    },
  },
})

export const buildActionContext = (): ActionContext => {
  let groupSeq = 0
  let promptSeq = 0
  let savedPromptSeq = 0

  return {
    now: () => '2026-02-07T10:00:00.000Z',
    createGroupId: (area: AreaKey) => gid(`${area}-g-new-${++groupSeq}`),
    createPromptId: (area: AreaKey) => pid(`${area}-p-new-${++promptSeq}`),
    createSavedPromptId: () => spid(`saved-prompt-new-${++savedPromptSeq}`),
  }
}
