import { isObject } from '../domain/validate'
import { SDK_VALIDATION_ERROR_CODES } from './errors'
import type {
  PromptEditorError,
  PromptEditorValidate,
  PromptEditorValidationInput,
  PromptEditorValidationResult,
  PromptEditorValue,
} from './types'

const toSdkError = (
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' = 'error',
): PromptEditorError => ({
  code,
  message,
  path,
  severity,
  source: 'sdk',
})

const isBlockingError = (error: PromptEditorError): boolean => (error.severity ?? 'error') === 'error'

const asStringError = (value: unknown, path: string): PromptEditorError | undefined => {
  if (typeof value !== 'string') {
    return toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_ROOT, `${path} must be a string`, path)
  }
  return undefined
}

const asBooleanError = (value: unknown, path: string): PromptEditorError | undefined => {
  if (typeof value !== 'boolean') {
    return toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_ROOT, `${path} must be a boolean`, path)
  }
  return undefined
}

const validateCollection = (value: unknown, path: string): PromptEditorError[] => {
  const errors: PromptEditorError[] = []

  if (!isObject(value)) {
    return [toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_COLLECTION, `${path} must be an object`, path)]
  }

  if (!Array.isArray(value.groupOrder)) {
    errors.push(
      toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_GROUP_ORDER, `${path}.groupOrder must be an array`, `${path}.groupOrder`),
    )
    return errors
  }

  if (!isObject(value.groups)) {
    errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_GROUPS_MAP, `${path}.groups must be an object map`, `${path}.groups`))
    return errors
  }

  if (!isObject(value.prompts)) {
    errors.push(
      toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPTS_MAP, `${path}.prompts must be an object map`, `${path}.prompts`),
    )
    return errors
  }

  const nameSet = new Set<string>()
  const groupOrder = value.groupOrder as unknown[]
  const groups = value.groups as Record<string, unknown>
  const prompts = value.prompts as Record<string, unknown>

  for (let index = 0; index < groupOrder.length; index += 1) {
    const groupId = groupOrder[index]
    const groupIdPath = `${path}.groupOrder[${index}]`

    const groupIdTypeError = asStringError(groupId, groupIdPath)
    if (groupIdTypeError) {
      errors.push(groupIdTypeError)
      continue
    }

    if (!isObject(groups[groupId])) {
      errors.push(
        toSdkError(
          SDK_VALIDATION_ERROR_CODES.MISSING_GROUP_REFERENCE,
          `${path}.groupOrder references missing group ${groupId}`,
          groupIdPath,
        ),
      )
      continue
    }

    const group = groups[groupId] as Record<string, unknown>
    const groupPath = `${path}.groups[${JSON.stringify(groupId)}]`

    const idError = asStringError(group.id, `${groupPath}.id`)
    if (idError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_GROUP, `${groupPath}.id must be a string`, `${groupPath}.id`))
    } else if (group.id !== groupId) {
      errors.push(
        toSdkError(
          SDK_VALIDATION_ERROR_CODES.GROUP_ID_MISMATCH,
          `${groupPath}.id must match map key`,
          `${groupPath}.id`,
        ),
      )
    }

    const nameError = asStringError(group.name, `${groupPath}.name`)
    if (nameError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_GROUP, `${groupPath}.name must be a string`, `${groupPath}.name`))
    } else {
      const normalizedName = group.name.trim()
      if (normalizedName.length === 0) {
        errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.EMPTY_GROUP_NAME, `${groupPath}.name cannot be empty`, `${groupPath}.name`))
      } else if (nameSet.has(normalizedName)) {
        errors.push(
          toSdkError(
            SDK_VALIDATION_ERROR_CODES.DUPLICATE_GROUP_NAME,
            `${path} has duplicate group name: ${normalizedName}`,
            `${groupPath}.name`,
          ),
        )
      } else {
        nameSet.add(normalizedName)
      }
    }

    if (!Array.isArray(group.promptIds)) {
      errors.push(
        toSdkError(
          SDK_VALIDATION_ERROR_CODES.INVALID_GROUP,
          `${groupPath}.promptIds must be an array`,
          `${groupPath}.promptIds`,
        ),
      )
    } else {
      for (let promptIndex = 0; promptIndex < group.promptIds.length; promptIndex += 1) {
        const promptId = group.promptIds[promptIndex]
        const promptIdPath = `${groupPath}.promptIds[${promptIndex}]`
        const promptIdTypeError = asStringError(promptId, promptIdPath)
        if (promptIdTypeError) {
          errors.push(promptIdTypeError)
          continue
        }

        if (!isObject(prompts[promptId])) {
          errors.push(
            toSdkError(
              SDK_VALIDATION_ERROR_CODES.MISSING_PROMPT_REFERENCE,
              `${groupPath}.promptIds references missing prompt ${promptId}`,
              promptIdPath,
            ),
          )
        }
      }
    }

    const collapsedError = asBooleanError(group.collapsed, `${groupPath}.collapsed`)
    if (collapsedError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_GROUP, `${groupPath}.collapsed must be a boolean`, `${groupPath}.collapsed`))
    }
  }

  for (const [promptId, prompt] of Object.entries(prompts)) {
    const promptPath = `${path}.prompts[${JSON.stringify(promptId)}]`
    if (!isObject(prompt)) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT, `${promptPath} must be an object`, promptPath))
      continue
    }

    const idError = asStringError(prompt.id, `${promptPath}.id`)
    if (idError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT, `${promptPath}.id must be a string`, `${promptPath}.id`))
    } else if (prompt.id !== promptId) {
      errors.push(
        toSdkError(
          SDK_VALIDATION_ERROR_CODES.PROMPT_ID_MISMATCH,
          `${promptPath}.id must match map key`,
          `${promptPath}.id`,
        ),
      )
    }

    const contentError = asStringError(prompt.content, `${promptPath}.content`)
    if (contentError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT, `${promptPath}.content must be a string`, `${promptPath}.content`))
    }

    const createdAtError = asStringError(prompt.createdAt, `${promptPath}.createdAt`)
    if (createdAtError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT, `${promptPath}.createdAt must be a string`, `${promptPath}.createdAt`))
    }

    const updatedAtError = asStringError(prompt.updatedAt, `${promptPath}.updatedAt`)
    if (updatedAtError) {
      errors.push(toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_PROMPT, `${promptPath}.updatedAt must be a string`, `${promptPath}.updatedAt`))
    }
  }

  return errors
}

const normalizeHostErrors = (errors: PromptEditorError[]): PromptEditorError[] =>
  errors.map((error, index) => {
    const severity = error.severity ?? 'error'
    if (!error.code || !error.message) {
      return toSdkError(
        SDK_VALIDATION_ERROR_CODES.INVALID_HOST_ERROR,
        `host validation returned malformed error at index ${index}`,
        `hostErrors[${index}]`,
      )
    }

    return {
      ...error,
      severity,
      source: 'host',
    }
  })

const parsePromptEditorValue = (value: unknown): { value?: PromptEditorValue; errors: PromptEditorError[] } => {
  if (!isObject(value)) {
    return {
      errors: [toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_ROOT, 'value must be an object', 'value')],
    }
  }

  const fragmentsErrors = validateCollection(value.fragments, 'value.fragments')
  const errors = [...fragmentsErrors]

  if (errors.length > 0) {
    return { errors }
  }

  return {
    value: value as unknown as PromptEditorValue,
    errors: [],
  }
}

export const validatePromptEditorValue = (value: unknown): PromptEditorError[] => parsePromptEditorValue(value).errors

const parsePromptEditorValidationInput = (
  value: unknown,
): { value?: PromptEditorValidationInput; errors: PromptEditorError[] } => {
  if (!isObject(value)) {
    return {
      errors: [toSdkError(SDK_VALIDATION_ERROR_CODES.INVALID_ROOT, 'value must be an object', 'value')],
    }
  }

  const libraryErrors = validateCollection(value.library, 'value.library')
  const fragmentsErrors = validateCollection(value.fragments, 'value.fragments')
  const errors = [...libraryErrors, ...fragmentsErrors]

  if (errors.length > 0) {
    return { errors }
  }

  return {
    value: value as PromptEditorValidationInput,
    errors: [],
  }
}

/**
 * 保存前校验入口：
 * 1) 先执行 SDK 基础结构校验；
 * 2) 仅当 SDK 基础校验通过时，才执行宿主扩展校验（支持 sync/async）；
 * 3) 任一 `severity=error` 错误都会触发 save gate（`canSave=false`）。
 */
export const validatePromptEditorBeforeSave = async (
  value: unknown,
  validate?: PromptEditorValidate,
): Promise<PromptEditorValidationResult> => {
  const baseResult = parsePromptEditorValidationInput(value)
  if (baseResult.errors.length > 0 || !baseResult.value) {
    return {
      value: undefined,
      errors: baseResult.errors,
      canSave: false,
    }
  }

  if (!validate) {
    return {
      value: baseResult.value,
      errors: [],
      canSave: true,
    }
  }

  const hostErrorsRaw = await validate(baseResult.value)
  const hostErrors = normalizeHostErrors(hostErrorsRaw)

  return {
    value: baseResult.value,
    errors: hostErrors,
    canSave: !hostErrors.some(isBlockingError),
  }
}

export const canSaveWithErrors = (errors: PromptEditorError[]): boolean => !errors.some(isBlockingError)
