import type { GroupId, PromptId } from '../../domain/types'
import type { PromptEditorLibrary, PromptEditorValue } from '../types'

const gid = (value: string): GroupId => value as GroupId
const pid = (value: string): PromptId => value as PromptId

export const createHostSdkDemoInitialLibrary = (): PromptEditorLibrary => ({
  groupOrder: [gid('demo-lib-group-1')],
  groups: {
    [gid('demo-lib-group-1')]: {
      id: gid('demo-lib-group-1'),
      name: 'Host Library',
      promptIds: [pid('demo-lib-prompt-1')],
      collapsed: false,
    },
  },
  prompts: {
    [pid('demo-lib-prompt-1')]: {
      id: pid('demo-lib-prompt-1'),
      content: 'Please answer in concise bullet points.',
      createdAt: '2026-02-09T00:00:00.000Z',
      updatedAt: '2026-02-09T00:00:00.000Z',
    },
  },
})

export const createHostSdkDemoInitialValue = (): PromptEditorValue => ({
  fragments: {
    groupOrder: [gid('demo-frag-group-1')],
    groups: {
      [gid('demo-frag-group-1')]: {
        id: gid('demo-frag-group-1'),
        name: 'Current Task',
        promptIds: [pid('demo-frag-prompt-1')],
        collapsed: false,
      },
    },
    prompts: {
      [pid('demo-frag-prompt-1')]: {
        id: pid('demo-frag-prompt-1'),
        content: 'Summarize this week updates and risks.',
        createdAt: '2026-02-09T00:00:00.000Z',
        updatedAt: '2026-02-09T00:00:00.000Z',
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
      fragments: 640,
    },
  },
  sessionUi: {
    expandedPromptIds: [],
  },
})
