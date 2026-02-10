# LLM Prompt Panel SPA

一个为 LLM 提示词工程师设计的轻量级、响应式三栏提示词管理工具。支持片段组合、库管理、拖拽排序及本地持久化。

## 1. 安装与运行

### 环境要求
- **Node.js**: 18.0.0 或更高版本
- **包管理器**: npm (建议使用 v9+)

### 快速开始
1. **安装依赖**:
   ```bash
   npm install
   ```
2. **启动开发服务器**:
   ```bash
   npm run dev
   ```
   访问 `http://localhost:5173` 即可开始使用。

## 2. 测试与验证

项目集成了完整的测试套件以确保质量：

- **单元与集成测试**: `npm run test` (使用 Vitest + React Testing Library)
- **类型检查**: `npm run typecheck` (使用 TypeScript)
- **构建生产版本**: `npm run build`
- **E2E 测试**: `npm run e2e` (使用 Playwright)

### E2E 测试覆盖范围 (Regression Specs)
系统通过 Playwright 覆盖了以下核心链路与边界情况：
- **基础流程 (`app`)**: 核心三栏交互与状态流转。
- **拖拽排序 (`library-dnd`)**: 库区条目与分组的排序交互。
- **片段管理 (`fragments`)**: 左栏分组创建、重命名、删除及片段编辑。
- **预览导出 (`prompt-text`)**: 实时文本合成与一键复制功能。
- **界面交互 (`splitter`)**: 三栏布局比例调整与重置。
- **空状态 (`empty-state`)**: 各区域初始状态的引导展示。
- **性能抗压 (`large-dataset`)**: 大数据量（100+ 条目）下的渲染与交互流畅度。
- **错误路径 (`error-paths`)**: 非法 JSON 导入、版本冲突等异常处理。
- **成品库 (`saved-prompts`)**: 成品保存、重名拒绝、加载替换、删除确认及持久化闭环测试。

## 3. 功能说明

项目采用经典的**三栏布局**，各区域职责明确：

### 左侧：片段区 (Fragments)
- **目的**: 组合当前任务所需的提示词片段。
- **操作**: 
  - 分组管理：创建、重命名、删除、折叠分组。
  - 排序移动：支持分组间及分组内的自由拖拽排序（仅限手柄）。
  - 快速编辑：点击片段即可进入编辑模式，支持即时修改。

### 中间：生成文本 (Prompt Text)
- **目的**: 实时预览并导出最终组合的提示词。
- **操作**:
  - 实时更新：左侧片段区的任何变动都会即时反映在此处。
  - 一键复制：点击右上角复制图标或使用快捷键。

### 右侧：侧边面板 (Side Panel)
- **目的**: 存储常用的提示词资产与成品。
- **双 Tab 模式**:
  - **片段库 (Library)**: 
    - 搜索过滤：支持对提示词内容的实时文本搜索与高亮显示。
    - 导入片段：点击“左箭头”按钮将提示词加入片段区（会自动根据库分组名在左侧创建或合并分组）。
    - 资产管理：支持 CRUD、重复创建 (Duplicate)、拖拽整理。
  - **成品库 (Saved Prompts)**:
    - 快照保存：保存当前片段区的结构（名称+标签），不保存预览文本。
    - 搜索筛选：支持按名称搜索及按标签 (Tags) 筛选。
    - 加载替换：加载成品将**完全替换**当前片段区内容。

## 4. 导入与导出

系统支持通过 JSON 文件进行数据的备份与迁移，详细格式请参考 [数据格式说明](./docs/DATA_FORMAT.md) 及 [成品库数据结构说明](./docs/SAVED_PROMPTS.md)。

- **范围**: 导入/导出主要覆盖 **右栏片段库 (Library)**，左栏片段区不受影响。
- **成品库约束**: v1 版本暂不支持成品库 (Saved Prompts) 的独立导入导出。
- **导出**: 点击片段库顶部的导出按钮，下载 `prompt-library-YYYY-MM-DD.json`。
- **导入**: 
  - 仅支持符合 [特定 Schema](./docs/DATA_FORMAT.md) 的 JSON 格式。
  - **策略**: 采用“擦除并替换 (Wipe & Replace)”模式，确认后将清空当前库区。
  - **预检统计**: 导入前系统会解析文件并显示“X 组 / Y 条”预检信息，需用户二次确认。
  - **校验规则**: 
    - 组名经过 `trim()` 后不能为空。
    - 组名在库内必须唯一（大小写敏感）。
  - **失败原因**: 常见于 JSON 结构错误、版本不匹配或违反组名唯一性规则。

## 5. 快捷键

为了提升效率，系统提供了以下 10 个核心快捷键与交互：

1. **Ctrl/Meta + C**: 复制生成的全部提示词。
2. **Ctrl/Meta + F**: 自动聚焦库区的搜索框。
3. **Enter**: 在编辑模式下保存内容。
4. **Esc**: 取消编辑、取消删除确认或关闭当前对话框。
5. **Enter / Space**: 非编辑状态下，展开或收起条目内容。
6. **Shift + Enter**: 编辑模式下不产生换行（等同保存/提交）。
7. **双击侧边栏分割线**: 重置三栏宽度到默认比例。
8. **拖拽 (DND)**: 仅通过拖拽手柄触发排序与移动。
9. **Tab**: 在 UI 元素间切换焦点。
10. **3s 二次确认**: 点击删除后有 3 秒确认时间（Esc 可快速撤回）。

> **注意**: 当输入框（Input/Textarea）聚焦时，全局快捷键（如 C/F）将被屏蔽，以避免冲突。

## 6. 数据存储

- **持久化**: 使用浏览器 `localStorage` 进行本地持久化。
- **Key**: `llm_prompt_panel_state`
- **特性**: 无需登录，数据随查随用，清理浏览器缓存会导致数据丢失。

## 7. 已知约束 (Guardrails)

本工具定位为纯前端轻量化工具，以下功能暂不支持：
- **无鉴权**: 数据完全存储在客户端。
- **无嵌套分组**: 仅支持一级分组。
- **无语义搜索**: 仅支持文本字符串匹配，不支持向量或模糊语义搜索。
- **无模板编辑器**: 暂不支持变量替换（如 `{{name}}`）。
- **无 Undo/Redo**: 删除操作提供 3 秒二次确认，但暂无全局撤销/重做流。
- **Prompt 单行语义**: 系统在存储层将换行符标准化为空格，以适配大多数 LLM 的单行 Prompt 习惯（UI 展示会进行软换行）。
- **同步限制**: 片段区是对库区的“深拷贝”，加入后两者不再双向同步。
- **成品库快照**: 成品库仅保存片段区的结构快照（不保存最终预览文本）；加载后将完全替换当前片段区。
- **成品库唯一性**: 成品名称经过 `trim()` 后不能为空，且在库内必须唯一（大小写敏感）。
- **成品库导出**: v1 版本暂不支持成品库数据的独立导入导出。

## 8. 桌面端构建 (macOS)

项目支持使用 **Tauri v2** 构建 macOS 原生桌面应用。

### 前置要求
- **Rust 环境**: 建议执行 `rustup update stable` 确保版本最新。
- **Xcode**: 需安装 Xcode 命令行工具（若 `xcodebuild` 缺失，预检脚本将发出警告）。

### 构建指令
1. **构建预检**:
   ```bash
   npm run tauri:precheck
   ```
2. **开发模式**:
   ```bash
   npm run tauri:dev
   ```
3. **正式构建**:
   ```bash
   npm run tauri:build
   ```

### 产物路径
构建完成后，`.app` 文件位于：
`src-tauri/target/release/bundle/macos/prompt-portal.app`

### v1 版本限制
- **未签名**: 暂未集成开发者证书签名与公证 (Notarization)。
- **无安装包**: 仅生成 `.app`，暂无 `.dmg` 或自动更新支持。
- **沙盒存储**: 仍沿用 `localStorage` 持久化，暂未集成文件系统 API。

## 9. React SDK 集成（PromptEditorSDK）

> 入口：`src/sdk/PromptEditorSDK.tsx`。可通过 `/?sdkDemo=1` 查看宿主集成示例。

### 基本用法（宿主受控 + Dialog + ref.requestSave/requestCancel）

```tsx
import { useRef, useState } from 'react'
import { PromptEditorSDK, type PromptEditorSDKHandle, type PromptEditorValue } from 'prompt-editor-sdk'

function HostDialogEditor() {
  const sdkRef = useRef<PromptEditorSDKHandle>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<PromptEditorValue>(initialValue)
  const [latestValue, setLatestValue] = useState<PromptEditorValue>(initialValue)
  const [library, setLibrary] = useState(initialLibrary)
  const [latestLibrary, setLatestLibrary] = useState(initialLibrary)
  const [error, setError] = useState('')

  return (
    <>
      <button
        onClick={() => {
          setValue(latestValue)
          setLibrary(latestLibrary)
          setOpen(true)
        }}
      >
        编辑
      </button>

      {open && (
        <div role="dialog">
          <PromptEditorSDK
            ref={sdkRef}
            value={value}
            initialLibrary={library}
            onLibraryChange={setLibrary}
            onSave={async (finalFragments) => ({ ok: true, value: finalFragments })}
            onCancel={() => {
              setOpen(false)
              setValue(latestValue)
              setLibrary(latestLibrary)
            }}
            onError={(e) => setError(e.message)}
          />

          <button
            onClick={async () => {
              const result = await sdkRef.current?.requestSave()
              if (!result) return
              if (result.ok) {
                setLatestValue((prev) => ({ ...prev, fragments: result.value }))
                setValue((prev) => ({ ...prev, fragments: result.value }))
                setLatestLibrary(library)
                setError('')
                setOpen(false)
              } else {
                setError(result.error.message)
              }
            }}
          >
            保存
          </button>

          <button onClick={() => sdkRef.current?.requestCancel()}>取消</button>
          {error ? <p>{error}</p> : null}
        </div>
      )}
    </>
  )
}
```

### 控制边界说明（Library 宿主控制）

- `value` 是 **fragments-only 受控值**（`fragments/ui/sessionUi/version/meta`），不包含 `library`。
- `library`（Library Tab 的片段库资产，不是 `savedPrompts`）通过 `initialLibrary` 初始化，通过 `onLibraryChange(nextLibrary)` 独立回传。
- SDK 不拥有宿主弹窗/按钮状态；保存与取消由宿主通过 `ref.requestSave()` / `ref.requestCancel()` 编排。
- `onSave` 参数与 `PromptEditorSaveResult.value` 都是 `FragmentState`（仅 fragments）。
- `readOnly`（或 `disabled`）开启后，SDK 进入只读态：不允许新增/编辑/删除/拖拽，`requestSave()` 返回 `SDK_READ_ONLY` 且不会触发 `onSave`。

### 跨仓库本地安装（最接近 npm 安装）

> 目标：先按 npm package 方式接入，功能稳定后可直接发布到 npm 仓库。

1. 在 SDK 仓库构建并打包：
   ```bash
   npm install
   npm run pack:sdk
   ```
   产物位于：`dist-pack/prompt-editor-sdk-<version>.tgz`

2. 在 Host 仓库安装本地 tarball：
   ```bash
   npm install /absolute/path/to/prompt-portal/dist-pack/prompt-editor-sdk-<version>.tgz
   ```

3. 在 Host 代码中按包名导入并引入样式：
   ```tsx
   import { PromptEditorSDK } from 'prompt-editor-sdk'
   import 'prompt-editor-sdk/style.css'
   ```

4. 依赖约束：Host 需提供 `react` / `react-dom`（SDK 以 peerDependencies 约束）。

### 无持久化副作用说明

- SDK 内部 store 默认 `enablePersistence=false`（并使用 no-op storage adapter）。
- 因此 SDK 模式下不会隐式写入 `localStorage`，保存动作仅通过 `onSave` 回传给宿主，由宿主决定是否持久化。

### 已知限制（v1）

- `PromptEditorSaveResult.value` 是 `FragmentState`（仅 fragments），不是完整 `PromptEditorValue`。
- `PromptEditorValue` 不包含 `library` 与 `savedPrompts`，因此这两类数据不会出现在 `onSave` 回传 payload。
- `readOnly` / `disabled` 在 SDK 模式已实现只读保护；App 主页面是否只读不在本 SDK 契约范围内。
