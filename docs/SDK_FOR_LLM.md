# PromptEditorSDK 文档（详细字段与类型，供 LLM 阅读）

> 目标：让 LLM/Agent 不读源码也能正确集成 `PromptEditorSDK`。

## 1) 入口与导出

- 包入口：`src/sdk/index.ts`
- 契约版本：`PROMPT_EDITOR_SDK_CONTRACT_VERSION = 1`

导出列表：

```ts
// component
PromptEditorSDK

// core types
PromptEditorError
PromptEditorSDKHandle
PromptEditorLibrary
PromptEditorSaveResult
PromptEditorSDKProps
PromptEditorValidate
PromptEditorValidationResult
PromptEditorValue

// store/state
NoopStorageAdapter
PromptEditorSDKStoreProvider
createPromptEditorSDKStore
usePromptEditorSDKStore
CreatePromptEditorSDKStoreOptions
PromptEditorSDKStoreProviderProps

// validation
validatePromptEditorValue
validatePromptEditorBeforeSave
canSaveWithErrors

// error codes
SDK_VALIDATION_ERROR_CODES
SdkValidationErrorCode
```

---

## 2) 数据类型（完整字段）

以下类型来自 `src/domain/types.ts` 与 `src/sdk/types.ts`。

### 2.1 基础领域类型

```ts
type PromptId = Brand<string, 'PromptId'>
type GroupId = Brand<string, 'GroupId'>

interface PromptItem {
  id: PromptId
  content: string
  createdAt: string
  updatedAt: string
}

interface PromptGroup {
  id: GroupId
  name: string
  promptIds: PromptId[]
  collapsed: boolean
}

interface PromptCollectionState {
  groupOrder: GroupId[]
  groups: Record<GroupId, PromptGroup>
  prompts: Record<PromptId, PromptItem>
}

type LibraryState = PromptCollectionState
type FragmentState = PromptCollectionState

interface PersistedUiState {
  panels: {
    libraryCollapsed: boolean
    fragmentsCollapsed: boolean
  }
  columnWidths: {
    library: number
    fragments: number
  }
}

interface SessionUiState {
  expandedPromptIds: PromptId[]
}
```

### 2.2 SDK 输入值：`PromptEditorValue`

```ts
interface PromptEditorLibrary extends LibraryState {
  version?: string | number
  meta?: Record<string, unknown>
}

interface PromptEditorValue {
  fragments: FragmentState
  ui?: PersistedUiState
  sessionUi?: SessionUiState
  version?: string | number
  meta?: Record<string, unknown>
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `fragments` | `FragmentState` | 是 | 左侧片段区数据 |
| `ui` | `PersistedUiState` | 否 | UI 持久态（列宽、折叠） |
| `sessionUi` | `SessionUiState` | 否 | 会话态 UI（仅内存） |
| `version` | `string \| number` | 否 | 宿主扩展版本号 |
| `meta` | `Record<string, unknown>` | 否 | 宿主扩展元信息 |

**避免误解（强约束）**：

- `PromptEditorValue` 是 **controlled value（fragments-only）**：不包含 `library`。
- `library` 是独立通道：通过 `initialLibrary` 初始化，通过 `onLibraryChange(nextLibrary)` 回传。
- `onSave(finalFragments)` 与 `PromptEditorSaveResult.value` 都是 `FragmentState`（仅 fragments）。
- `savedPrompts` 不在 SDK 受控 payload 中，不会出现在 `onSave` / `PromptEditorSaveResult.value`。

### 2.3 错误类型：`PromptEditorError`

```ts
interface PromptEditorError {
  code: string
  message: string
  path?: string
  source?: 'sdk' | 'host'
  severity?: 'error' | 'warning'
  cause?: unknown
  meta?: Record<string, unknown>
}
```

### 2.4 校验相关类型

```ts
type PromptEditorValidate = (
  value: PromptEditorValidationInput,
) => PromptEditorError[] | Promise<PromptEditorError[]>

interface PromptEditorValidationResult {
  value?: PromptEditorValidationInput
  errors: PromptEditorError[]
  canSave: boolean
}

interface PromptEditorValidationInput extends PromptEditorValue {
  library: PromptEditorLibrary
}
```

### 2.5 保存结果：`PromptEditorSaveResult`

```ts
type PromptEditorSaveResult =
  | {
      ok: true
      value: FragmentState
      meta?: Record<string, unknown>
    }
  | {
      ok: false
      value: FragmentState
      error: PromptEditorError
      errors?: PromptEditorError[]
      meta?: Record<string, unknown>
    }
```

### 2.6 组件 Ref 与 Props

```ts
interface PromptEditorSDKHandle {
  requestSave: () => Promise<PromptEditorSaveResult>
  requestCancel: () => void
  getValue: () => PromptEditorValue
}

interface PromptEditorSDKProps {
  value: PromptEditorValue
  initialLibrary: PromptEditorLibrary
  disabled?: boolean
  readOnly?: boolean
  onLibraryChange?: (nextLibrary: PromptEditorLibrary) => void
  onSave: (finalFragments: FragmentState) => void | Promise<PromptEditorSaveResult | void>
  onCancel: () => void
  onError?: (error: PromptEditorError) => void
  validate?: PromptEditorValidate
}
```

---

## 3) Store/Provider 类型

来自 `src/sdk/state/store.ts` 与 `src/sdk/state/provider.tsx`。

```ts
interface CreatePromptEditorSDKStoreOptions {
  enablePersistence?: boolean
  storageAdapter?: StorageAdapter
}

interface PromptEditorSDKStoreProviderProps {
  children: ReactNode
  store?: AppStoreApi
  enablePersistence?: boolean
  storageAdapter?: StorageAdapter
}
```

默认行为：

- `enablePersistence` 默认 `false`
- `storageAdapter` 默认 `new NoopStorageAdapter()`

结论：SDK 模式默认无本地持久化副作用。

---

## 4) 校验与保存语义

入口：`validatePromptEditorBeforeSave(value, validate?)`

顺序：

1. SDK 基础结构校验（collection、group/prompt 引用、字段类型、重复组名等）
2. 若通过，再执行宿主 `validate`（支持 sync/async）
3. 任一 `severity = 'error'` => `canSave = false`

`requestSave()` 的行为：

- `canSave = true`：调用 `onSave(finalFragments)`，返回 `ok: true` 或宿主自定义结果
- `canSave = false`：不调用 `onSave`，返回 `ok: false`（含 `error/errors`）

---

## 5) 错误码常量（`SDK_VALIDATION_ERROR_CODES`）

```ts
{
  INVALID_ROOT: 'SDK_INVALID_ROOT',
  INVALID_COLLECTION: 'SDK_INVALID_COLLECTION',
  INVALID_GROUP_ORDER: 'SDK_INVALID_GROUP_ORDER',
  INVALID_GROUPS_MAP: 'SDK_INVALID_GROUPS_MAP',
  INVALID_PROMPTS_MAP: 'SDK_INVALID_PROMPTS_MAP',
  INVALID_GROUP: 'SDK_INVALID_GROUP',
  INVALID_PROMPT: 'SDK_INVALID_PROMPT',
  MISSING_GROUP_REFERENCE: 'SDK_MISSING_GROUP_REFERENCE',
  MISSING_PROMPT_REFERENCE: 'SDK_MISSING_PROMPT_REFERENCE',
  GROUP_ID_MISMATCH: 'SDK_GROUP_ID_MISMATCH',
  PROMPT_ID_MISMATCH: 'SDK_PROMPT_ID_MISMATCH',
  EMPTY_GROUP_NAME: 'SDK_EMPTY_GROUP_NAME',
  DUPLICATE_GROUP_NAME: 'SDK_DUPLICATE_GROUP_NAME',
  INVALID_HOST_ERROR: 'HOST_INVALID_ERROR'
}
```

---

## 6) 宿主最小接入（受控 + ref）

```tsx
const sdkRef = useRef<PromptEditorSDKHandle>(null)
const [value, setValue] = useState<PromptEditorValue>(initialValue)
const [library, setLibrary] = useState<PromptEditorLibrary>(initialLibrary)

<PromptEditorSDK
  ref={sdkRef}
  value={value}
  initialLibrary={library}
  onLibraryChange={setLibrary}
  onSave={async (finalFragments) => ({ ok: true, value: finalFragments })}
  onCancel={() => setOpen(false)}
  validate={hostValidate}
/>

const onHostSave = async () => {
  const result = await sdkRef.current?.requestSave()
  if (result?.ok) {
    setLatestValue((prev) => ({ ...prev, fragments: result.value }))
    setOpen(false)
  }
}
```

关键规则：

1. `value` 仅承载 fragments 相关切片；`library` 不在 `value` 里。
2. `initialLibrary` 负责 SDK 内 library 初始化，library 编辑需接 `onLibraryChange`。
3. 保存/取消由宿主按钮触发 ref API，且 `onSave` 只接收 `FragmentState`。
4. 不要假设 SDK 会自动写入 localStorage/db。

### 6.1 `readOnly/disabled` 行为说明

- 当 `readOnly === true` 或 `disabled === true` 时，SDK 进入只读态（两者等价处理）。
- 只读态下禁用：
  - 新建分组/新建片段
  - 编辑、删除、重命名
  - 拖拽排序/跨组移动
  - Library 导入
- 只读态下仍可用：
  - 浏览与搜索
  - 导出
  - 快捷键帮助查看
- 在只读态调用 `requestSave()`：
  - 返回 `PromptEditorSaveResult` 的失败分支
  - `error.code === 'SDK_READ_ONLY'`
  - 不会调用 `onSave`

---

## 7) 设想使用场景（1个）

### 场景：SaaS 后台中的「提示词配置弹窗」

目标：

- 左侧 `fragments` 才是最终要保存到业务配置的数据。
- 右侧 `library` 只作为 SDK 内编辑辅助，宿主只做初始化与代理转发。

调用方式（宿主侧）示例：

```tsx
import { useRef, useState } from 'react'
import {
  PromptEditorSDK,
  type PromptEditorSDKHandle,
  type PromptEditorValue,
  type PromptEditorLibrary,
  type PromptEditorValidationInput,
} from 'prompt-editor-sdk'

export function PromptConfigDialog() {
  const sdkRef = useRef<PromptEditorSDKHandle>(null)

  // 业务最终保存对象（fragments-only）
  const [value] = useState<PromptEditorValue>(initialValue)

  // library 仅初始化 + 代理转发
  const [library, setLibrary] = useState<PromptEditorLibrary>(initialLibrary)

  const validate = async (input: PromptEditorValidationInput) => {
    // 可同时校验 fragments + library
    return []
  }

  const handleSave = async () => {
    const result = await sdkRef.current?.requestSave()
    if (!result || !result.ok) return

    // ✅ 这里只拿到 fragments
    await api.savePromptFragments(result.value)
  }

  return (
    <PromptEditorSDK
      ref={sdkRef}
      value={value}
      initialLibrary={library}
      onLibraryChange={(nextLibrary) => {
        setLibrary(nextLibrary)
        void api.proxyLibraryChange(nextLibrary) // 宿主做代理转发
      }}
      onSave={async (finalFragments) => {
        // 与 requestSave 语义一致：finalFragments 仅左侧数据
        await api.savePromptFragments(finalFragments)
      }}
      onCancel={() => closeDialog()}
      validate={validate}
    />
  )
}
```

该场景下的职责边界：

1. 宿主保存只处理 `fragments`。
2. `library` 通过 `initialLibrary` + `onLibraryChange` 单独管理。
3. SDK 不负责持久化。

---

## 8) 跨仓本地发布（npm-like）

SDK 仓库：

```bash
npm install
npm run pack:sdk
```

产物：`dist-pack/prompt-editor-sdk-<version>.tgz`

Host 仓库安装：

```bash
npm install /absolute/path/to/prompt-portal/dist-pack/prompt-editor-sdk-<version>.tgz
```

Host 导入：

```tsx
import { PromptEditorSDK } from 'prompt-editor-sdk'
import 'prompt-editor-sdk/style.css'
```

---

## 9) 已知限制（v1）

- `PromptEditorValue` 不包含 `library` 与 `savedPrompts`（成品库）。
- 右栏 Saved Prompts 的变更不会进入 `PromptEditorSaveResult.value`，宿主也不会通过 `onSave` 收到该部分数据。
- `disabled/readOnly` 在 SDK 模式已实现只读保护；App 主页面是否只读不在本 SDK 文档范围内。
