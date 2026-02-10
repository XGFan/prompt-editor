import type { ReactNode } from 'react'

import type { StorageAdapter } from '../../domain/storage'
import { AppStoreProvider, useAppStoreFromContext } from '../../store/provider'
import type { AppStoreApi } from '../../store/store'

import { NoopStorageAdapter } from './noopStorageAdapter'

export interface PromptEditorSDKStoreProviderProps {
  children: ReactNode
  store?: AppStoreApi
  enablePersistence?: boolean
  storageAdapter?: StorageAdapter
}

export const PromptEditorSDKStoreProvider = ({
  children,
  store,
  enablePersistence = false,
  storageAdapter,
}: PromptEditorSDKStoreProviderProps) => {
  return (
    <AppStoreProvider
      store={store}
      storeOptions={{
        enablePersistence,
        storageAdapter: storageAdapter ?? new NoopStorageAdapter(),
      }}
    >
      {children}
    </AppStoreProvider>
  )
}

export const usePromptEditorSDKStore = useAppStoreFromContext
