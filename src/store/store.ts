import { create, type StateCreator } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import { LocalStorageAdapter } from '../domain/localStorageAdapter'
import { SCHEMA_VERSION, type AppState, type GroupId, type PromptCollectionState, type PromptId, type SessionUiState } from '../domain/types'
import type { StorageAdapter } from '../domain/storage'
import {
  addLibraryPromptToFragments,
  createGroup,
  createPrompt,
  deleteGroup,
  deletePrompt,
  duplicatePrompt,
  editPromptContent,
  movePrompt,
  reorderGroup,
  reorderPromptWithinGroup,
  renameGroup,
  resetColumnWidths,
  setColumnWidths,
  toggleGroupCollapsed,
  togglePromptExpanded,
  saveCurrentFragmentsAsSavedPrompt,
  loadSavedPromptToFragments,
  renameSavedPrompt,
  updateSavedPromptTags,
  deleteSavedPrompt,
  type AreaKey,
} from './actions'

const createEmptyCollection = (): PromptCollectionState => ({
  groupOrder: [],
  groups: {},
  prompts: {},
})

export const createInitialAppState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  library: createEmptyCollection(),
  fragments: createEmptyCollection(),
  savedPrompts: {
    order: [],
    items: {},
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
    activeLibraryGroupId: null,
  },
})

export const createInitialSessionUiState = (): SessionUiState => ({
  expandedPromptIds: [],
})

export interface AppStore {
  state: AppState
  sessionUi: SessionUiState
  createGroup: (params: { area: AreaKey; name: string }) => void
  renameGroup: (params: { area: AreaKey; groupId: GroupId; name: string }) => void
  deleteGroup: (params: { area: AreaKey; groupId: GroupId }) => void
  reorderGroup: (params: { area: AreaKey; sourceIndex: number; targetIndex: number }) => void
  toggleGroupCollapsed: (params: { area: AreaKey; groupId: GroupId }) => void
  createPrompt: (params: { area: AreaKey; groupId: GroupId; content: string }) => void
  editPromptContent: (params: { area: AreaKey; promptId: PromptId; content: string }) => void
  deletePrompt: (params: { area: AreaKey; groupId: GroupId; promptId: PromptId }) => void
  reorderPromptWithinGroup: (params: {
    area: AreaKey
    groupId: GroupId
    sourceIndex: number
    targetIndex: number
  }) => void
  movePrompt: (params: {
    area: AreaKey
    fromGroupId: GroupId
    toGroupId: GroupId
    promptId: PromptId
    targetIndex: number
  }) => void
  duplicatePrompt: (params: { area: AreaKey; groupId: GroupId; promptId: PromptId }) => void
  addLibraryPromptToFragments: (params: { libraryPromptId: PromptId; libraryGroupId: GroupId }) => void
  saveCurrentFragmentsAsSavedPrompt: (params: { name: string; tags: string[] }) => Promise<void>
  loadSavedPromptToFragments: (params: { savedPromptId: string }) => Promise<void>
  renameSavedPrompt: (params: { savedPromptId: string; name: string }) => Promise<void>
  updateSavedPromptTags: (params: { savedPromptId: string; tags: string[] }) => Promise<void>
  deleteSavedPrompt: (params: { savedPromptId: string }) => Promise<void>
  togglePromptExpanded: (promptId: PromptId) => void
  setColumnWidths: (params: { totalWidth: number; library: number; fragments: number }) => void
  resetColumnWidths: (params: { totalWidth: number }) => void
  hydrateFromStorage: (adapter?: StorageAdapter) => Promise<void>
  persistToStorage: (adapter?: StorageAdapter) => Promise<void>
  save: (adapter?: StorageAdapter) => Promise<void>
}

export interface CreateAppStoreOptions {
  enablePersistence?: boolean
  storageAdapter?: StorageAdapter
}

interface ResolvedCreateAppStoreOptions {
  enablePersistence: boolean
  storageAdapter: StorageAdapter
}

export type AppStoreApi = StoreApi<AppStore>

const resolveCreateAppStoreOptions = (options?: CreateAppStoreOptions): ResolvedCreateAppStoreOptions => ({
  enablePersistence: options?.enablePersistence ?? true,
  storageAdapter: options?.storageAdapter ?? new LocalStorageAdapter(),
})

const createAppStoreStateCreator = (options: ResolvedCreateAppStoreOptions): StateCreator<AppStore> => (set, get) => {
  const getStorageAdapter = (adapter?: StorageAdapter): StorageAdapter => adapter ?? options.storageAdapter

  return {
    state: createInitialAppState(),
    sessionUi: createInitialSessionUiState(),

    createGroup: async (params) => {
      set((store) => ({ state: createGroup(store.state, params) }))
      await get().save()
    },
    renameGroup: async (params) => {
      set((store) => ({ state: renameGroup(store.state, params) }))
      await get().save()
    },
    deleteGroup: async (params) => {
      set((store) => ({ state: deleteGroup(store.state, params) }))
      await get().save()
    },
    reorderGroup: async (params) => {
      set((store) => ({ state: reorderGroup(store.state, params) }))
      await get().save()
    },
    toggleGroupCollapsed: async (params) => {
      set((store) => ({ state: toggleGroupCollapsed(store.state, params) }))
      await get().save()
    },

    createPrompt: async (params) => {
      set((store) => ({ state: createPrompt(store.state, params) }))
      await get().save()
    },
    editPromptContent: async (params) => {
      set((store) => ({ state: editPromptContent(store.state, params) }))
      await get().save()
    },
    deletePrompt: async (params) => {
      set((store) => ({ state: deletePrompt(store.state, params) }))
      await get().save()
    },
    reorderPromptWithinGroup: async (params) => {
      set((store) => ({ state: reorderPromptWithinGroup(store.state, params) }))
      await get().save()
    },
    movePrompt: async (params) => {
      set((store) => ({ state: movePrompt(store.state, params) }))
      await get().save()
    },
    duplicatePrompt: async (params) => {
      set((store) => ({ state: duplicatePrompt(store.state, params) }))
      await get().save()
    },
    addLibraryPromptToFragments: async (params) => {
      set((store) => ({
        state: addLibraryPromptToFragments(store.state, params),
      }))
      await get().save()
    },

    saveCurrentFragmentsAsSavedPrompt: async (params) => {
      set((store) => ({
        state: saveCurrentFragmentsAsSavedPrompt(store.state, params),
      }))
      await get().save()
    },
    loadSavedPromptToFragments: async (params) => {
      set((store) => ({
        state: loadSavedPromptToFragments(store.state, params),
      }))
      await get().save()
    },
    renameSavedPrompt: async (params) => {
      set((store) => ({
        state: renameSavedPrompt(store.state, params),
      }))
      await get().save()
    },
    updateSavedPromptTags: async (params) => {
      set((store) => ({
        state: updateSavedPromptTags(store.state, params),
      }))
      await get().save()
    },
    deleteSavedPrompt: async (params) => {
      set((store) => ({
        state: deleteSavedPrompt(store.state, params),
      }))
      await get().save()
    },

    togglePromptExpanded: (promptId) =>
      set((store) => ({
        sessionUi: togglePromptExpanded(store.sessionUi, promptId),
      })),

    setColumnWidths: (params) =>
      set((store) => ({
        state: setColumnWidths(store.state, params),
      })),
    resetColumnWidths: (params) =>
      set((store) => ({
        state: resetColumnWidths(store.state, params),
      })),

    hydrateFromStorage: async (adapter?: StorageAdapter) => {
      if (!options.enablePersistence) {
        return
      }
      const loaded = await getStorageAdapter(adapter).load()
      if (!loaded) {
        return
      }
      set({ state: loaded })
    },

    persistToStorage: async (adapter?: StorageAdapter) => {
      if (!options.enablePersistence) {
        return
      }
      await getStorageAdapter(adapter).save(get().state)
    },

    save: async (adapter?: StorageAdapter) => {
      if (!options.enablePersistence) {
        return
      }
      await get().persistToStorage(adapter)
    },
  }
}

export const createAppStore = (options?: CreateAppStoreOptions): AppStoreApi =>
  createStore<AppStore>(createAppStoreStateCreator(resolveCreateAppStoreOptions(options)))

export const useAppStore = create<AppStore>(createAppStoreStateCreator(resolveCreateAppStoreOptions()))
