import { useStore } from 'zustand'

import { useOptionalAppStoreApiFromContext } from './provider'
import type { AppStore } from './store'
import { useAppStore } from './store'

export const useAppStoreSelector = <T,>(selector: (state: AppStore) => T): T => {
  const contextStore = useOptionalAppStoreApiFromContext()
  const storeApi = contextStore ?? useAppStore

  return useStore(storeApi, selector)
}

export const useCurrentAppStoreApi = () => {
  const contextStore = useOptionalAppStoreApiFromContext()
  return contextStore ?? useAppStore
}
