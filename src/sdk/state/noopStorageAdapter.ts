import type { AppState } from '../../domain/types'
import { type StorageAdapter, exportAppStateJson, importAppStateJson } from '../../domain/storage'

export class NoopStorageAdapter implements StorageAdapter {
  async load(): Promise<AppState | null> {
    return null
  }

  async save(_state: AppState): Promise<void> {
    return
  }

  exportJson(state: AppState): string {
    return exportAppStateJson(state)
  }

  importJson(json: string): AppState {
    return importAppStateJson(json)
  }
}
