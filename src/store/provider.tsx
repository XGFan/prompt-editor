import { createContext, type ReactNode, useContext, useRef } from 'react'
import { useStore } from 'zustand'

import { createAppStore, type AppStore, type AppStoreApi, type CreateAppStoreOptions } from './store'

export const AppStoreContext = createContext<AppStoreApi | null>(null)

export interface AppStoreProviderProps {
  children: ReactNode
  store?: AppStoreApi
  storeOptions?: CreateAppStoreOptions
}

export const AppStoreProvider = ({ children, store, storeOptions }: AppStoreProviderProps) => {
  const storeRef = useRef<AppStoreApi | null>(store ?? null)

  if (!storeRef.current) {
    storeRef.current = createAppStore(storeOptions)
  }

  return <AppStoreContext.Provider value={storeRef.current}>{children}</AppStoreContext.Provider>
}

export const useAppStoreApiFromContext = (): AppStoreApi => {
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new Error('useAppStoreApiFromContext must be used within <AppStoreProvider>.')
  }
  return store
}

export const useOptionalAppStoreApiFromContext = (): AppStoreApi | null => {
  return useContext(AppStoreContext)
}

export const useAppStoreFromContext = <T,>(selector: (state: AppStore) => T): T => {
  const store = useAppStoreApiFromContext()
  return useStore(store, selector)
}
