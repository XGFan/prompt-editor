import type { StorageAdapter } from '../../domain/storage'
import { createAppStore, type AppStoreApi } from '../../store/store'

import { NoopStorageAdapter } from './noopStorageAdapter'

export interface CreatePromptEditorSDKStoreOptions {
  enablePersistence?: boolean
  storageAdapter?: StorageAdapter
}

export const createPromptEditorSDKStore = (options?: CreatePromptEditorSDKStoreOptions): AppStoreApi =>
  createAppStore({
    enablePersistence: options?.enablePersistence ?? false,
    storageAdapter: options?.storageAdapter ?? new NoopStorageAdapter(),
  })
