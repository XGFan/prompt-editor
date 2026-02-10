import { mkdirSync, writeFileSync } from 'node:fs'

mkdirSync('dist-sdk', { recursive: true })

const dts = `import * as React from 'react'

export type PromptCollectionState = {
  groupOrder: string[]
  groups: Record<string, { id: string; name: string; promptIds: string[]; collapsed: boolean }>
  prompts: Record<string, { id: string; content: string; createdAt: string; updatedAt: string }>
}

export type LibraryState = PromptCollectionState
export type FragmentState = PromptCollectionState

export type PromptEditorLibrary = {
  version?: string | number
  meta?: Record<string, unknown>
} & LibraryState

export type PromptEditorValue = {
  fragments: FragmentState
  ui?: Record<string, unknown>
  sessionUi?: Record<string, unknown>
  version?: string | number
  meta?: Record<string, unknown>
}

export type PromptEditorValidationInput = PromptEditorValue & {
  library: PromptEditorLibrary
}

export type PromptEditorError = {
  code: string
  message: string
  path?: string
  source?: 'sdk' | 'host'
  severity?: 'error' | 'warning'
  cause?: unknown
  meta?: Record<string, unknown>
}

export type PromptEditorValidate = (
  value: PromptEditorValidationInput
) => PromptEditorError[] | Promise<PromptEditorError[]>

export type PromptEditorValidationResult = {
  value?: PromptEditorValidationInput
  errors: PromptEditorError[]
  canSave: boolean
}

export type PromptEditorSaveResult =
  | { ok: true; value: FragmentState; meta?: Record<string, unknown> }
  | {
      ok: false
      value: FragmentState
      error: PromptEditorError
      errors?: PromptEditorError[]
      meta?: Record<string, unknown>
    }

export type PromptEditorSDKHandle = {
  requestSave: () => Promise<PromptEditorSaveResult>
  requestCancel: () => void
  getValue: () => PromptEditorValue
}

export type PromptEditorSDKProps = {
  value: PromptEditorValue
  initialLibrary: PromptEditorLibrary
  disabled?: boolean
  readOnly?: boolean
  onLibraryChange?: (nextLibrary: PromptEditorLibrary) => void
  onSave: (
    finalFragments: FragmentState
  ) => void | Promise<void | PromptEditorSaveResult>
  onCancel: () => void
  onError?: (error: PromptEditorError) => void
  validate?: PromptEditorValidate
}

export type PromptEditorSDKStoreOptions = {
  enablePersistence?: boolean
  storageAdapter?: unknown
}

export class NoopStorageAdapter {
  load(): Promise<null>
  save(nextState: unknown): Promise<void>
  exportJson(state: unknown): string
  importJson(json: string): unknown
}

export function createPromptEditorSDKStore(options?: PromptEditorSDKStoreOptions): unknown

export function PromptEditorSDKStoreProvider(props: {
  children: React.ReactNode
  store?: unknown
  options?: PromptEditorSDKStoreOptions
}): React.ReactElement

export function usePromptEditorSDKStore<T>(selector: (state: unknown) => T): T

export const PromptEditorSDK: React.ForwardRefExoticComponent<
  PromptEditorSDKProps & React.RefAttributes<PromptEditorSDKHandle>
>

export function validatePromptEditorValue(value: unknown): PromptEditorError[]

export function validatePromptEditorBeforeSave(
  value: unknown,
  validate?: PromptEditorValidate
): Promise<PromptEditorValidationResult>

export function canSaveWithErrors(errors: PromptEditorError[]): boolean

export const SDK_VALIDATION_ERROR_CODES: Record<string, string>
export type SdkValidationErrorCode = string

export const PROMPT_EDITOR_SDK_CONTRACT_VERSION = 1
`

writeFileSync('dist-sdk/index.d.ts', dts, 'utf8')
