export type Brand<T, B extends string> = T & { readonly __brand: B }

export type PromptId = Brand<string, 'PromptId'>
export type GroupId = Brand<string, 'GroupId'>
export type SavedPromptId = Brand<string, 'SavedPromptId'>

export const SCHEMA_VERSION = 1 as const
export type SchemaVersion = typeof SCHEMA_VERSION

export interface PromptItem {
  id: PromptId
  content: string
  createdAt: string
  updatedAt: string
}

export interface PromptGroup {
  id: GroupId
  name: string
  promptIds: PromptId[]
  collapsed: boolean
}

export interface PromptCollectionState {
  groupOrder: GroupId[]
  groups: Record<GroupId, PromptGroup>
  prompts: Record<PromptId, PromptItem>
}

export type LibraryState = PromptCollectionState
export type FragmentState = PromptCollectionState

export interface SavedPrompt {
  id: SavedPromptId
  name: string
  tags: string[]
  snapshot: PromptCollectionState
  createdAt: string
  updatedAt: string
}

export interface PersistedUiState {
  panels: {
    libraryCollapsed: boolean
    fragmentsCollapsed: boolean
  }
  columnWidths: {
    library: number
    fragments: number
  }
  activeLibraryGroupId: string | null
}

export interface AppState {
  schemaVersion: SchemaVersion
  library: LibraryState
  fragments: FragmentState
  savedPrompts: {
    order: SavedPromptId[]
    items: Record<SavedPromptId, SavedPrompt>
  }
  ui: PersistedUiState
}

/**
 * 会话态 UI：例如“某条 Prompt 是否展开”属于仅内存状态，
 * 不进入持久化 AppState，避免污染导入/导出数据。
 */
export interface SessionUiState {
  expandedPromptIds: PromptId[]
}
