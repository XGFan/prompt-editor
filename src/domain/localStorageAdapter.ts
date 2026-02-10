import { type AppState } from './types'
import {
  type StorageAdapter,
  exportAppStateJson,
  importAppStateJson,
} from './storage'

const STORAGE_KEY = 'llm_prompt_panel_state'

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppState | null> {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    try {
      return importAppStateJson(raw)
    } catch (e) {
      console.error('Failed to load state from localStorage:', e)
      return null
    }
  }

  async save(state: AppState): Promise<void> {
    const json = exportAppStateJson(state)
    localStorage.setItem(STORAGE_KEY, json)
  }

  exportJson(state: AppState): string {
    return exportAppStateJson(state)
  }

  importJson(json: string): AppState {
    return importAppStateJson(json)
  }
}
