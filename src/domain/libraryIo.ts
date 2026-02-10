import { SCHEMA_VERSION, type LibraryState } from './types'
import {
  ValidationError,
  isObject,
  parseCollection,
  assertUniqueGroupNames,
} from './validate'

export const exportLibraryToJson = (library: LibraryState): string => {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    library,
  })
}

export const importLibraryFromJson = (json: string): LibraryState => {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new ValidationError('invalid JSON payload')
  }

  if (!isObject(raw)) {
    throw new ValidationError('library data must be an object')
  }

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new ValidationError(
      `unsupported schema version: ${String(raw.schemaVersion)} (expected ${SCHEMA_VERSION})`,
    )
  }

  const library = parseCollection(raw.library, 'library')
  assertUniqueGroupNames(library, 'library')

  return library
}

export const previewLibraryJson = (json: string): { groupCount: number; promptCount: number } => {
  const library = importLibraryFromJson(json)
  return {
    groupCount: library.groupOrder.length,
    promptCount: Object.keys(library.prompts).length,
  }
}
