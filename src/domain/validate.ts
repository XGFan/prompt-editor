import {
  SCHEMA_VERSION,
  type AppState,
  type FragmentState,
  type GroupId,
  type PromptCollectionState,
  type PromptGroup,
  type PromptId,
  type SavedPrompt,
  type SavedPromptId,
} from './types'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const asString = (value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${path} must be a string`)
  }
  return value
}

export const asBoolean = (value: unknown, path: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${path} must be a boolean`)
  }
  return value
}

export const asNumber = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(`${path} must be a number`)
  }
  return value
}

export const parsePromptGroup = (value: unknown, path: string): PromptGroup => {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`)
  }

  const promptIdsRaw = value.promptIds
  if (!Array.isArray(promptIdsRaw)) {
    throw new ValidationError(`${path}.promptIds must be an array`)
  }

  return {
    id: asString(value.id, `${path}.id`) as GroupId,
    name: asString(value.name, `${path}.name`),
    promptIds: promptIdsRaw.map((id, index) => asString(id, `${path}.promptIds[${index}]`) as PromptId),
    collapsed: asBoolean(value.collapsed, `${path}.collapsed`),
  }
}

export const parseCollection = (value: unknown, path: string): PromptCollectionState => {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`)
  }

  const groupOrderRaw = value.groupOrder
  if (!Array.isArray(groupOrderRaw)) {
    throw new ValidationError(`${path}.groupOrder must be an array`)
  }

  if (!isObject(value.groups)) {
    throw new ValidationError(`${path}.groups must be an object map`)
  }

  if (!isObject(value.prompts)) {
    throw new ValidationError(`${path}.prompts must be an object map`)
  }

  const groups = Object.entries(value.groups).reduce<Record<GroupId, PromptGroup>>((acc, [key, raw]) => {
    acc[key as GroupId] = parsePromptGroup(raw, `${path}.groups[${JSON.stringify(key)}]`)
    return acc
  }, {})

  const prompts = Object.entries(value.prompts).reduce<Record<PromptId, AppState['library']['prompts'][PromptId]>>(
    (acc, [key, raw]) => {
      if (!isObject(raw)) {
        throw new ValidationError(`${path}.prompts[${JSON.stringify(key)}] must be an object`)
      }

      acc[key as PromptId] = {
        id: asString(raw.id, `${path}.prompts[${JSON.stringify(key)}].id`) as PromptId,
        content: asString(raw.content, `${path}.prompts[${JSON.stringify(key)}].content`),
        createdAt: asString(raw.createdAt, `${path}.prompts[${JSON.stringify(key)}].createdAt`),
        updatedAt: asString(raw.updatedAt, `${path}.prompts[${JSON.stringify(key)}].updatedAt`),
      }

      return acc
    },
    {},
  )

  const groupOrder = groupOrderRaw.map((groupId, index) =>
    asString(groupId, `${path}.groupOrder[${index}]`) as GroupId,
  )

  validateCollectionIntegrity({ groupOrder, groups, prompts }, path)

  return {
    groupOrder,
    groups,
    prompts,
  }
}

export const assertUniqueGroupNames = (collection: FragmentState, path: string): void => {
  const names = new Set<string>()

  for (const groupId of collection.groupOrder) {
    const group = collection.groups[groupId]
    if (!group) {
      throw new ValidationError(`${path}.groupOrder references missing group ${groupId}`)
    }

    const nameKey = group.name.trim()
    if (nameKey.length === 0) {
      throw new ValidationError(`${path}.groups[${JSON.stringify(groupId)}].name cannot be empty`)
    }

    if (names.has(nameKey)) {
      throw new ValidationError(`${path} has duplicate group name: ${nameKey}`)
    }
    names.add(nameKey)
  }
}

export const validateCollectionIntegrity = (collection: PromptCollectionState, path: string): void => {
  for (const groupId of collection.groupOrder) {
    if (!collection.groups[groupId]) {
      throw new ValidationError(`${path}.groupOrder references missing group ${groupId}`)
    }
  }

  for (const [groupId, group] of Object.entries(collection.groups)) {
    if (group.id !== groupId) {
      throw new ValidationError(`${path}.groups[${JSON.stringify(groupId)}].id must match map key`)
    }

    for (const promptId of group.promptIds) {
      if (!collection.prompts[promptId]) {
        throw new ValidationError(
          `${path}.groups[${JSON.stringify(groupId)}].promptIds references missing prompt ${promptId}`,
        )
      }
    }
  }
}

export const parseSavedPrompt = (value: unknown, path: string): SavedPrompt => {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`)
  }

  const tagsRaw = value.tags
  if (!Array.isArray(tagsRaw)) {
    throw new ValidationError(`${path}.tags must be an array`)
  }

  const name = asString(value.name, `${path}.name`)
  if (name.trim().length === 0) {
    throw new ValidationError(`${path}.name cannot be empty`)
  }

  return {
    id: asString(value.id, `${path}.id`) as SavedPromptId,
    name,
    tags: tagsRaw.map((tag, index) => asString(tag, `${path}.tags[${index}]`)),
    snapshot: parseCollection(value.snapshot, `${path}.snapshot`),
    createdAt: asString(value.createdAt, `${path}.createdAt`),
    updatedAt: asString(value.updatedAt, `${path}.updatedAt`),
  }
}

export const parseSavedPromptsSlice = (value: unknown, path: string): AppState['savedPrompts'] => {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`)
  }

  const orderRaw = value.order
  if (!Array.isArray(orderRaw)) {
    throw new ValidationError(`${path}.order must be an array`)
  }

  if (!isObject(value.items)) {
    throw new ValidationError(`${path}.items must be an object map`)
  }

  const items = Object.entries(value.items).reduce<Record<SavedPromptId, SavedPrompt>>((acc, [key, raw]) => {
    acc[key as SavedPromptId] = parseSavedPrompt(raw, `${path}.items[${JSON.stringify(key)}]`)
    return acc
  }, {})

  const order = orderRaw.map((id, index) => asString(id, `${path}.order[${index}]`) as SavedPromptId)

  for (const id of order) {
    if (!items[id]) {
      throw new ValidationError(`${path}.order references missing saved prompt ${id}`)
    }
  }

  for (const [id, item] of Object.entries(items)) {
    if (item.id !== id) {
      throw new ValidationError(`${path}.items[${JSON.stringify(id)}].id must match map key`)
    }
  }

  return { order, items }
}

export const validateAppState = (value: unknown): AppState => {
  if (!isObject(value)) {
    throw new ValidationError('app state must be an object')
  }

  const schemaVersion = value.schemaVersion
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new ValidationError(
      `unsupported schema version: ${String(schemaVersion)} (expected ${SCHEMA_VERSION})`,
    )
  }

  const library = parseCollection(value.library, 'library')
  const fragments = parseCollection(value.fragments, 'fragments')

  const savedPrompts = value.savedPrompts !== undefined
    ? parseSavedPromptsSlice(value.savedPrompts, 'savedPrompts')
    : { order: [], items: {} }

  assertUniqueGroupNames(library, 'library')
  assertUniqueGroupNames(fragments, 'fragments')

  if (!isObject(value.ui)) {
    throw new ValidationError('ui must be an object')
  }

  if (!isObject(value.ui.panels)) {
    throw new ValidationError('ui.panels must be an object')
  }

  if (!isObject(value.ui.columnWidths)) {
    throw new ValidationError('ui.columnWidths must be an object')
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    library,
    fragments,
    savedPrompts,
    ui: {
      panels: {
        libraryCollapsed: asBoolean(value.ui.panels.libraryCollapsed, 'ui.panels.libraryCollapsed'),
        fragmentsCollapsed: asBoolean(value.ui.panels.fragmentsCollapsed, 'ui.panels.fragmentsCollapsed'),
      },
      columnWidths: {
        library: asNumber(value.ui.columnWidths.library, 'ui.columnWidths.library'),
        fragments: asNumber(value.ui.columnWidths.fragments, 'ui.columnWidths.fragments'),
      },
      activeLibraryGroupId:
        value.ui.activeLibraryGroupId === undefined || value.ui.activeLibraryGroupId === null
          ? null
          : asString(value.ui.activeLibraryGroupId, 'ui.activeLibraryGroupId'),
    },
  }
}
