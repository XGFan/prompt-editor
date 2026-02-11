import type { FragmentState, LibraryState, PersistedUiState, SessionUiState } from '../domain/types'

/**
 * Prompt Editor SDK 合同（受控模式）
 *
 * 约定：
 * 1) SDK 仅负责渲染与交互，不负责持久化（不落库、无 localStorage/db 副作用）。
 * 2) 宿主通过 props 传入 `value`（仅 fragments 相关）与 `initialLibrary`（library 初始化）。
 * 3) library 初始化由宿主提供，library 变更通过独立回调 `onLibraryChange(nextLibrary)` 回传。
 * 4) 保存/取消由宿主编排：SDK 只通过 `onSave(finalFragments)` / `onCancel()` 发出意图。
 * 5) 契约保持“最小且可扩展”：核心字段最小集合 + 可选 `version/meta` 扩展位。
 */

export interface PromptEditorLibrary extends LibraryState {
  /** 可选契约版本（业务自定义） */
  version?: string | number
  /** 可选宿主扩展元信息（例如来源、租户、追踪字段） */
  meta?: Record<string, unknown>
}

export interface PromptEditorValue {
  /** 左栏 Fragments 状态 */
  fragments: FragmentState
  /** 可选 UI 持久态快照（由宿主决定是否使用） */
  ui?: PersistedUiState
  /** 可选会话态 UI（纯内存语义） */
  sessionUi?: SessionUiState
  /** 可选扩展版本 */
  version?: string | number
  /** 可选扩展元信息 */
  meta?: Record<string, unknown>
  /** 生成的提示词文本 */
  promptText?: string
}

/**
 * onSave 回传给宿主的保存数据（最小集合）：
 * - fragments：编辑内容主体
 * - promptText：根据当前格式生成的提示词文本
 * - version / meta：宿主扩展位（透传）
 *
 * 不含 library（走 onLibraryChange 独立通道）、
 * 不含 ui / sessionUi（编辑器内部状态，不属于保存语义）。
 */
export interface PromptEditorSaveData {
  /** 编辑内容主体 */
  fragments: FragmentState
  /** 根据当前格式生成的提示词文本 */
  promptText: string
  /** 可选扩展版本（透传自 props.value） */
  version?: string | number
  /** 可选扩展元信息（透传自 props.value） */
  meta?: Record<string, unknown>
}

/**
 * 保存前校验输入（SDK 内部构造）：
 * - 包含 fragments（保存主体）
 * - 包含 library（供完整结构校验与宿主校验使用）
 */
export interface PromptEditorValidationInput extends PromptEditorValue {
  library: PromptEditorLibrary
}

export interface PromptEditorError {
  /** 错误分类码（宿主可扩展） */
  code: string
  /** 用户可读或日志可读信息 */
  message: string
  /** 可选字段路径，风格对齐 domain validate 的 path 语义 */
  path?: string
  /** 错误来源（SDK 基础校验或宿主扩展校验） */
  source?: 'sdk' | 'host'
  /** 严重级别（error 会阻止保存，warning 仅提示） */
  severity?: 'error' | 'warning'
  /** 可选原始原因 */
  cause?: unknown
  /** 可选扩展上下文 */
  meta?: Record<string, unknown>
}

export type PromptEditorValidate = (
  value: PromptEditorValidationInput,
) => PromptEditorError[] | Promise<PromptEditorError[]>

export interface PromptEditorValidationResult {
  value?: PromptEditorValidationInput
  errors: PromptEditorError[]
  canSave: boolean
}

export type PromptEditorSaveResult =
  | {
      ok: true
      value: PromptEditorSaveData
      meta?: Record<string, unknown>
    }
  | {
      ok: false
      value: PromptEditorSaveData
      error: PromptEditorError
      errors?: PromptEditorError[]
      meta?: Record<string, unknown>
    }

export interface PromptEditorSDKHandle {
  /**
   * 宿主触发保存：SDK 先执行基础 + 宿主扩展校验，
   * 仅当 canSave=true 时才调用 onSave(finalValue)。
   */
  requestSave: () => Promise<PromptEditorSaveResult>
  /** 宿主触发取消：仅通知，不提交变更 */
  requestCancel: () => void
  /** 获取当前编辑快照（store -> value） */
  getValue: () => PromptEditorValue
}

export interface PromptEditorSDKProps {
  /** 宿主传入的 fragments 相关输入值 */
  value: PromptEditorValue
  /** 宿主提供的 library 初始化值（仅用于初始化 SDK 内部 library） */
  initialLibrary: PromptEditorLibrary
  /** 可选禁用态 */
  disabled?: boolean
  /** 可选只读态 */
  readOnly?: boolean
  /** 锁定格式（SDK 传入时锁定格式，隐藏切换） */
  format?: 'markdown' | 'yaml' | 'xml'

  /** library 变更事件（独立通道） */
  onLibraryChange?: (nextLibrary: PromptEditorLibrary) => void

  /** 保存意图事件（回传保存数据；组件不落库） */
  onSave: (finalValue: PromptEditorSaveData) => void | Promise<PromptEditorSaveResult | void>

  /** 取消意图事件 */
  onCancel: () => void

  /** 可选错误通道（宿主统一处理） */
  onError?: (error: PromptEditorError) => void

  /** 可选宿主扩展校验（sync/async） */
  validate?: PromptEditorValidate
}
