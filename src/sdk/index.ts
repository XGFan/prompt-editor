import '../index.css'

export type {
  PromptEditorError,
  PromptEditorSDKHandle,
  PromptEditorLibrary,
  PromptEditorSaveResult,
  PromptEditorSDKProps,
  PromptEditorValidate,
  PromptEditorValidationResult,
  PromptEditorValue,
} from './types'
export {
  NoopStorageAdapter,
  PromptEditorSDKStoreProvider,
  createPromptEditorSDKStore,
  usePromptEditorSDKStore,
  type CreatePromptEditorSDKStoreOptions,
  type PromptEditorSDKStoreProviderProps,
} from './state'
export { PromptEditorSDK } from './PromptEditorSDK'
export { canSaveWithErrors, validatePromptEditorBeforeSave, validatePromptEditorValue } from './validation'
export type { SdkValidationErrorCode } from './errors'
export { SDK_VALIDATION_ERROR_CODES } from './errors'

/** SDK 契约版本：用于后续组件实现与宿主协商 */
export const PROMPT_EDITOR_SDK_CONTRACT_VERSION = 1 as const
