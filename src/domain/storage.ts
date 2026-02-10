import { SCHEMA_VERSION, type AppState } from './types'
import { ValidationError, validateAppState } from './validate'

export interface StorageAdapter {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
  exportJson(state: AppState): string
  importJson(json: string): AppState
}

/**
 * 迁移钩子占位：后续 schemaVersion 升级时在这里接入迁移链。
 */
export const migrateToCurrentSchema = (raw: unknown): unknown => {
  if (typeof raw !== 'object' || raw === null) {
    return raw
  }

  const currentVersion = (raw as { schemaVersion?: unknown }).schemaVersion
  if (currentVersion === SCHEMA_VERSION) {
    return raw
  }

  throw new ValidationError(`unsupported schema version: ${String(currentVersion)}`)
}

export const exportAppStateJson = (state: AppState): string => {
  // 先验证，确保导出的状态结构稳定。
  const validated = validateAppState(state)
  return JSON.stringify(validated)
}

export const importAppStateJson = (json: string): AppState => {
  let raw: unknown
  try {
    raw = JSON.parse(json) as unknown
  } catch {
    throw new ValidationError('invalid JSON payload')
  }

  const migrated = migrateToCurrentSchema(raw)
  return validateAppState(migrated)
}
