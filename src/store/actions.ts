import type { AppState, GroupId, PromptCollectionState, PromptId, SavedPromptId, SessionUiState } from '../domain/types'
import { ValidationError, validateCollectionIntegrity } from '../domain/validate'

export type AreaKey = 'library' | 'fragments'

export interface ActionContext {
  now: () => string
  createGroupId: (area: AreaKey) => GroupId
  createPromptId: (area: AreaKey) => PromptId
  createSavedPromptId: () => SavedPromptId
}

const randomId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const defaultActionContext: ActionContext = {
  now: () => new Date().toISOString(),
  createGroupId: (area) => `${area}-g-${randomId()}` as GroupId,
  createPromptId: (area) => `${area}-p-${randomId()}` as PromptId,
  createSavedPromptId: () => `saved-prompt-${randomId()}` as SavedPromptId,
}

export const COLUMN_MIN_WIDTHS = {
  library: 260,
  fragments: 360,
  right: 300,
} as const

export const COLUMN_DEFAULT_RATIO = {
  library: 22,
  fragments: 48,
  right: 30,
} as const

const getCollection = (state: AppState, area: AreaKey): PromptCollectionState => state[area]

const updateCollection = (state: AppState, area: AreaKey, collection: PromptCollectionState): AppState => ({
  ...state,
  [area]: collection,
})

const normalizeGroupName = (name: string): string => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    throw new ValidationError('group name cannot be empty')
  }
  return trimmed
}

const ensureGroupNameUnique = (
  collection: PromptCollectionState,
  name: string,
  area: AreaKey,
  excludeGroupId?: GroupId,
): void => {
  const normalized = normalizeGroupName(name)
  const duplicated = collection.groupOrder.some((groupId) => {
    if (excludeGroupId && groupId === excludeGroupId) {
      return false
    }
    const group = collection.groups[groupId]
    return !!group && group.name.trim() === normalized
  })

  if (duplicated) {
    throw new ValidationError(`${area} has duplicate group name: ${normalized}`)
  }
}

const ensureGroup = (collection: PromptCollectionState, groupId: GroupId, area: AreaKey) => {
  const group = collection.groups[groupId]
  if (!group) {
    throw new ValidationError(`${area}.groups is missing ${groupId}`)
  }
  return group
}

const ensurePrompt = (collection: PromptCollectionState, promptId: PromptId, area: AreaKey) => {
  const prompt = collection.prompts[promptId]
  if (!prompt) {
    throw new ValidationError(`${area}.prompts is missing ${promptId}`)
  }
  return prompt
}

const ensureIndex = (length: number, index: number, field: string): void => {
  if (index < 0 || index >= length) {
    throw new ValidationError(`${field} out of range`)
  }
}

const moveInArray = <T>(arr: T[], sourceIndex: number, targetIndex: number): T[] => {
  ensureIndex(arr.length, sourceIndex, 'sourceIndex')
  ensureIndex(arr.length, targetIndex, 'targetIndex')

  const next = [...arr]
  const [item] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, item)
  return next
}

const clampInsertIndex = (index: number, length: number): number => Math.max(0, Math.min(index, length))

const validateAreaCollection = (collection: PromptCollectionState, area: AreaKey): void => {
  validateCollectionIntegrity(collection, area)
}

const cloneCollectionSnapshot = (collection: PromptCollectionState): PromptCollectionState => {
  if (typeof structuredClone === 'function') {
    return structuredClone(collection)
  }

  return JSON.parse(JSON.stringify(collection)) as PromptCollectionState
}

const normalizeSavedPromptName = (name: string): string => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    throw new ValidationError('saved prompt name cannot be empty')
  }
  return trimmed
}

const ensureSavedPromptNameUnique = (
  state: AppState,
  name: string,
  excludeSavedPromptId?: SavedPromptId,
): void => {
  const normalized = normalizeSavedPromptName(name)
  const duplicated = state.savedPrompts.order.some((savedPromptId) => {
    if (excludeSavedPromptId && savedPromptId === excludeSavedPromptId) {
      return false
    }
    const existing = state.savedPrompts.items[savedPromptId]
    return !!existing && existing.name.trim() === normalized
  })

  if (duplicated) {
    throw new ValidationError(`saved prompts has duplicate name: ${normalized}`)
  }
}

const normalizeTags = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawTag of tags) {
    const tag = rawTag.trim()
    if (tag.length === 0 || seen.has(tag)) {
      continue
    }

    seen.add(tag)
    normalized.push(tag)
  }

  return normalized
}

const ensureSavedPrompt = (state: AppState, savedPromptId: SavedPromptId) => {
  const savedPrompt = state.savedPrompts.items[savedPromptId]
  if (!savedPrompt) {
    throw new ValidationError(`savedPrompts.items is missing ${savedPromptId}`)
  }
  return savedPrompt
}

export const saveCurrentFragmentsAsSavedPrompt = (
  state: AppState,
  params: { name: string; tags: string[] },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const name = normalizeSavedPromptName(params.name)
  ensureSavedPromptNameUnique(state, name)

  const id = ctx.createSavedPromptId()
  const timestamp = ctx.now()

  return {
    ...state,
    savedPrompts: {
      order: [...state.savedPrompts.order, id],
      items: {
        ...state.savedPrompts.items,
        [id]: {
          id,
          name,
          tags: normalizeTags(params.tags),
          snapshot: cloneCollectionSnapshot(state.fragments),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    },
  }
}

export const loadSavedPromptToFragments = (
  state: AppState,
  params: { savedPromptId: SavedPromptId },
): AppState => {
  const savedPrompt = ensureSavedPrompt(state, params.savedPromptId)
  const nextFragments = cloneCollectionSnapshot(savedPrompt.snapshot)

  validateAreaCollection(nextFragments, 'fragments')
  return {
    ...state,
    fragments: nextFragments,
  }
}

export const renameSavedPrompt = (
  state: AppState,
  params: { savedPromptId: SavedPromptId; name: string },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const savedPrompt = ensureSavedPrompt(state, params.savedPromptId)
  const name = normalizeSavedPromptName(params.name)
  ensureSavedPromptNameUnique(state, name, params.savedPromptId)

  return {
    ...state,
    savedPrompts: {
      ...state.savedPrompts,
      items: {
        ...state.savedPrompts.items,
        [params.savedPromptId]: {
          ...savedPrompt,
          name,
          updatedAt: ctx.now(),
        },
      },
    },
  }
}

export const updateSavedPromptTags = (
  state: AppState,
  params: { savedPromptId: SavedPromptId; tags: string[] },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const savedPrompt = ensureSavedPrompt(state, params.savedPromptId)

  return {
    ...state,
    savedPrompts: {
      ...state.savedPrompts,
      items: {
        ...state.savedPrompts.items,
        [params.savedPromptId]: {
          ...savedPrompt,
          tags: normalizeTags(params.tags),
          updatedAt: ctx.now(),
        },
      },
    },
  }
}

export const deleteSavedPrompt = (state: AppState, params: { savedPromptId: SavedPromptId }): AppState => {
  ensureSavedPrompt(state, params.savedPromptId)

  const nextItems = { ...state.savedPrompts.items }
  delete nextItems[params.savedPromptId]

  return {
    ...state,
    savedPrompts: {
      order: state.savedPrompts.order.filter((id) => id !== params.savedPromptId),
      items: nextItems,
    },
  }
}

export const createGroup = (
  state: AppState,
  params: { area: AreaKey; name: string },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const collection = getCollection(state, params.area)
  const groupName = normalizeGroupName(params.name)
  ensureGroupNameUnique(collection, groupName, params.area)

  const groupId = ctx.createGroupId(params.area)
  const nextCollection: PromptCollectionState = {
    ...collection,
    groupOrder: [...collection.groupOrder, groupId],
    groups: {
      ...collection.groups,
      [groupId]: {
        id: groupId,
        name: groupName,
        promptIds: [],
        collapsed: false,
      },
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const renameGroup = (state: AppState, params: { area: AreaKey; groupId: GroupId; name: string }): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)
  const groupName = normalizeGroupName(params.name)
  ensureGroupNameUnique(collection, groupName, params.area, params.groupId)

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        name: groupName,
      },
    },
  }
  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const deleteGroup = (state: AppState, params: { area: AreaKey; groupId: GroupId }): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)

  const nextGroups = { ...collection.groups }
  delete nextGroups[params.groupId]

  const nextPrompts = { ...collection.prompts }
  for (const promptId of group.promptIds) {
    delete nextPrompts[promptId]
  }

  const nextCollection: PromptCollectionState = {
    ...collection,
    groupOrder: collection.groupOrder.filter((groupId) => groupId !== params.groupId),
    groups: nextGroups,
    prompts: nextPrompts,
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const reorderGroup = (
  state: AppState,
  params: { area: AreaKey; sourceIndex: number; targetIndex: number },
): AppState => {
  const collection = getCollection(state, params.area)
  const nextCollection: PromptCollectionState = {
    ...collection,
    groupOrder: moveInArray(collection.groupOrder, params.sourceIndex, params.targetIndex),
  }
  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const toggleGroupCollapsed = (state: AppState, params: { area: AreaKey; groupId: GroupId }): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        collapsed: !group.collapsed,
      },
    },
  }
  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const createPrompt = (
  state: AppState,
  params: { area: AreaKey; groupId: GroupId; content: string },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)

  const promptId = ctx.createPromptId(params.area)
  const timestamp = ctx.now()

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        promptIds: [...group.promptIds, promptId],
      },
    },
    prompts: {
      ...collection.prompts,
      [promptId]: {
        id: promptId,
        content: params.content.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const editPromptContent = (
  state: AppState,
  params: { area: AreaKey; promptId: PromptId; content: string },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const collection = getCollection(state, params.area)
  const prompt = ensurePrompt(collection, params.promptId, params.area)

  const nextCollection: PromptCollectionState = {
    ...collection,
    prompts: {
      ...collection.prompts,
      [params.promptId]: {
        ...prompt,
        content: params.content,
        updatedAt: ctx.now(),
      },
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const deletePrompt = (
  state: AppState,
  params: { area: AreaKey; groupId: GroupId; promptId: PromptId },
): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)
  ensurePrompt(collection, params.promptId, params.area)

  if (!group.promptIds.includes(params.promptId)) {
    throw new ValidationError(`${params.area}.groups[${params.groupId}] does not reference ${params.promptId}`)
  }

  const nextPrompts = { ...collection.prompts }
  delete nextPrompts[params.promptId]

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        promptIds: group.promptIds.filter((id) => id !== params.promptId),
      },
    },
    prompts: nextPrompts,
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const reorderPromptWithinGroup = (
  state: AppState,
  params: { area: AreaKey; groupId: GroupId; sourceIndex: number; targetIndex: number },
): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        promptIds: moveInArray(group.promptIds, params.sourceIndex, params.targetIndex),
      },
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const movePrompt = (
  state: AppState,
  params: {
    area: AreaKey
    fromGroupId: GroupId
    toGroupId: GroupId
    promptId: PromptId
    targetIndex: number
  },
): AppState => {
  const collection = getCollection(state, params.area)
  const fromGroup = ensureGroup(collection, params.fromGroupId, params.area)
  const toGroup = ensureGroup(collection, params.toGroupId, params.area)
  ensurePrompt(collection, params.promptId, params.area)

  if (!fromGroup.promptIds.includes(params.promptId)) {
    throw new ValidationError(`${params.area}.groups[${params.fromGroupId}] does not reference ${params.promptId}`)
  }

  const fromPromptIds = fromGroup.promptIds.filter((id) => id !== params.promptId)

  const baseTarget = params.fromGroupId === params.toGroupId ? fromPromptIds : toGroup.promptIds
  const safeTargetIndex = clampInsertIndex(params.targetIndex, baseTarget.length)
  const toPromptIds = [...baseTarget]
  toPromptIds.splice(safeTargetIndex, 0, params.promptId)

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.fromGroupId]: {
        ...fromGroup,
        promptIds: params.fromGroupId === params.toGroupId ? toPromptIds : fromPromptIds,
      },
      ...(params.fromGroupId === params.toGroupId
        ? {}
        : {
            [params.toGroupId]: {
              ...toGroup,
              promptIds: toPromptIds,
            },
          }),
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const duplicatePrompt = (
  state: AppState,
  params: { area: AreaKey; groupId: GroupId; promptId: PromptId },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const collection = getCollection(state, params.area)
  const group = ensureGroup(collection, params.groupId, params.area)
  const original = ensurePrompt(collection, params.promptId, params.area)

  const sourceIndex = group.promptIds.indexOf(params.promptId)
  if (sourceIndex < 0) {
    throw new ValidationError(`${params.area}.groups[${params.groupId}] does not reference ${params.promptId}`)
  }

  const promptId = ctx.createPromptId(params.area)
  const timestamp = ctx.now()
  const promptIds = [...group.promptIds]
  promptIds.splice(sourceIndex + 1, 0, promptId)

  const nextCollection: PromptCollectionState = {
    ...collection,
    groups: {
      ...collection.groups,
      [params.groupId]: {
        ...group,
        promptIds,
      },
    },
    prompts: {
      ...collection.prompts,
      [promptId]: {
        id: promptId,
        content: original.content,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
  }

  validateAreaCollection(nextCollection, params.area)
  return updateCollection(state, params.area, nextCollection)
}

export const addLibraryPromptToFragments = (
  state: AppState,
  params: { libraryPromptId: PromptId; libraryGroupId: GroupId },
  ctx: ActionContext = defaultActionContext,
): AppState => {
  const libraryGroup = ensureGroup(state.library, params.libraryGroupId, 'library')
  const libraryPrompt = ensurePrompt(state.library, params.libraryPromptId, 'library')

  if (!libraryGroup.promptIds.includes(params.libraryPromptId)) {
    throw new ValidationError(`library.groups[${params.libraryGroupId}] does not reference ${params.libraryPromptId}`)
  }

  const targetName = libraryGroup.name.trim()
  const existingTargetGroupId = state.fragments.groupOrder.find((groupId) => {
    const group = state.fragments.groups[groupId]
    return !!group && group.name.trim() === targetName
  })

  const timestamp = ctx.now()
  const newPromptId = ctx.createPromptId('fragments')

  let nextFragments: PromptCollectionState = {
    ...state.fragments,
    groupOrder: [...state.fragments.groupOrder],
    groups: { ...state.fragments.groups },
    prompts: {
      ...state.fragments.prompts,
      [newPromptId]: {
        id: newPromptId,
        content: libraryPrompt.content,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
  }

  let targetGroupId = existingTargetGroupId
  if (!targetGroupId) {
    targetGroupId = ctx.createGroupId('fragments')
    nextFragments.groupOrder.push(targetGroupId)
    nextFragments.groups[targetGroupId] = {
      id: targetGroupId,
      name: targetName,
      promptIds: [],
      collapsed: false,
    }
  }

  const targetGroup = ensureGroup(nextFragments, targetGroupId, 'fragments')
  nextFragments = {
    ...nextFragments,
    groups: {
      ...nextFragments.groups,
      [targetGroupId]: {
        ...targetGroup,
        promptIds: [...targetGroup.promptIds, newPromptId],
      },
    },
  }

  validateAreaCollection(nextFragments, 'fragments')
  return {
    ...state,
    fragments: nextFragments,
  }
}

export const togglePromptExpanded = (sessionUi: SessionUiState, promptId: PromptId): SessionUiState => {
  const exists = sessionUi.expandedPromptIds.includes(promptId)
  if (exists) {
    return {
      ...sessionUi,
      expandedPromptIds: sessionUi.expandedPromptIds.filter((id) => id !== promptId),
    }
  }

  return {
    ...sessionUi,
    expandedPromptIds: [...sessionUi.expandedPromptIds, promptId],
  }
}

export const clampColumnWidths = (params: {
  totalWidth: number
  library: number
  fragments: number
}): { library: number; fragments: number } => {
  const minTotal = COLUMN_MIN_WIDTHS.library + COLUMN_MIN_WIDTHS.fragments + COLUMN_MIN_WIDTHS.right
  const total = Math.max(Math.round(params.totalWidth), minTotal)

  let library = Math.max(Math.round(params.library), COLUMN_MIN_WIDTHS.library)
  let fragments = Math.max(Math.round(params.fragments), COLUMN_MIN_WIDTHS.fragments)

  const maxFragments = total - COLUMN_MIN_WIDTHS.right - library
  if (fragments > maxFragments) {
    fragments = maxFragments
  }

  if (fragments < COLUMN_MIN_WIDTHS.fragments) {
    fragments = COLUMN_MIN_WIDTHS.fragments
    library = total - COLUMN_MIN_WIDTHS.right - fragments
  }

  if (library < COLUMN_MIN_WIDTHS.library) {
    library = COLUMN_MIN_WIDTHS.library
    fragments = total - COLUMN_MIN_WIDTHS.right - library
  }

  return {
    library,
    fragments,
  }
}

export const setColumnWidths = (
  state: AppState,
  params: { totalWidth: number; library: number; fragments: number },
): AppState => {
  const next = clampColumnWidths(params)
  return {
    ...state,
    ui: {
      ...state.ui,
      columnWidths: next,
    },
  }
}

export const resetColumnWidths = (state: AppState, params: { totalWidth: number }): AppState => {
  const library = Math.round((params.totalWidth * COLUMN_DEFAULT_RATIO.library) / 100)
  const fragments = Math.round((params.totalWidth * COLUMN_DEFAULT_RATIO.fragments) / 100)
  return setColumnWidths(state, {
    totalWidth: params.totalWidth,
    library,
    fragments,
  })
}
