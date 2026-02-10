# 数据导入/导出格式说明 (Data Format)

本文档详细说明了 Prompt Portal 项目中 **JSON 导入与导出** 的数据格式、校验规则及处理流程。

## 1. 格式概览

导出文件为标准的 JSON 格式。当前支持的 `schemaVersion` 为 `1`。

### 最小示例
```json
{
  "schemaVersion": 1,
  "library": {
    "groupOrder": [],
    "groups": {},
    "prompts": {}
  }
}
```

### 典型示例 (含 2 组多条 Prompts)
```json
{
  "schemaVersion": 1,
  "library": {
    "groupOrder": ["group-1", "group-2"],
    "groups": {
      "group-1": {
        "id": "group-1",
        "name": "写作辅助",
        "promptIds": ["p-1", "p-2"],
        "collapsed": false
      },
      "group-2": {
        "id": "group-2",
        "name": "代码助手",
        "promptIds": ["p-3"],
        "collapsed": true
      }
    },
    "prompts": {
      "p-1": {
        "id": "p-1",
        "content": "帮我润色这段文字，使其更加专业。",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "p-2": {
        "id": "p-2",
        "content": "将以下段落翻译成英文。",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "p-3": {
        "id": "p-3",
        "content": "解释这段代码的逻辑。",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

## 2. 字段解释

### 根节点
- `schemaVersion` (number): 格式版本号。当前必须为 `1`。
- `library` (object): 提示词库数据主体。

### Library 对象
- `groupOrder` (string[]): 组的显示顺序，存放 `GroupId`。
- `groups` (Record<GroupId, PromptGroup>): 组的详情映射表。
- `prompts` (Record<PromptId, PromptItem>): 提示词详情映射表。

### PromptGroup (组)
- `id` (string): 组的唯一标识符。
- `name` (string): 组名。
- `promptIds` (string[]): 属于该组的提示词 ID 列表及其排序。
- `collapsed` (boolean): 在 UI 中是否处于收起状态。

### PromptItem (提示词)
- `id` (string): 提示词的唯一标识符。
- `content` (string): 提示词内容。
- `createdAt` / `updatedAt` (string): ISO 格式的时间戳。

> **注意**：提示词项没有 `name` 或 `title` 字段，其唯一语义内容为 `content`。

## 3. 导入流程与行为

### 导入策略：全量覆盖 (Wipe & Replace)
导入操作 **不是合并**。一旦确认导入，当前的 **右栏 Prompt 库 (Library)** 数据将被完全清空，并替换为 JSON 文件中的内容。
*注意：左栏草稿 (Fragments) 和 UI 配置不会受此影响。*

### 流程阶段
1. **选择文件**：用户在 UI 中触发导入并选择 `.json` 文件。
2. **预检 (Preview)**：系统解析 JSON 并计算统计信息。
   - 统计公式：`组数 = library.groupOrder.length` / `条数 = Object.keys(prompts).length`。
3. **确认覆盖**：UI 弹出对话框告知预检统计结果，用户确认后执行覆盖。
4. **结果反馈**：导入成功后立即刷新库列表；若失败则弹出错误提示。

## 4. 校验规则与错误策略

如果 JSON 数据违反以下规则，导入将被拒绝：

### 基础校验
- **非法 JSON**：文件内容不是合法的 JSON 字符串。
- **结构不匹配**：缺少必要字段（如 `groupOrder`）或字段类型错误（如 `groups` 不是对象）。
- **版本不支持**：`schemaVersion` 与当前程序支持的版本不一致。

### 业务校验
- **组名规则**：
  - 组名经过 `trim()` 处理后不能为空。
  - 同一个 Library 内组名必须唯一（仅 trim 后比较，大小写敏感）。
  - 实现依据：`validate.ts: assertUniqueGroupNames`。
- **内容处理**：
  - 提示词 `content` 采用“单行语义”。虽然 JSON 允许 `\n`，但在 UI 保存或编辑时，换行符会被归一化为空格，以保证在列表中预览的一致性。
- **完整性校验**：
  - `groupOrder` 中的 ID 必须在 `groups` 中存在。
  - `groups` 中的 `promptIds` 必须在 `prompts` 中存在。

## 5. 兼容性与迁移

- **当前支持**：仅支持 `schemaVersion: 1`。
- **未来升级**：当 `schemaVersion` 提升时，项目会保留旧版本的迁移逻辑（Migration Hook），在 `validate` 之前将旧数据转换为新结构。

---

## 与代码一致性自检清单 (Checklist)

- [x] `schemaVersion` 是否为 1？ (对齐 `types.ts`)
- [x] 导入是否仅覆盖 `library` 且为 wipe & replace？ (对齐 `libraryIo.ts`)
- [x] 预检统计是否基于 `groupOrder.length` 和 `Object.keys(prompts).length`？ (对齐 `libraryIo.ts`)
- [x] 组名是否要求 trim 后非空且唯一？ (对齐 `validate.ts`)
- [x] Prompt 是否只有 `content` 字段而无 `title/name`？ (对齐 `types.ts`)
- [x] 错误消息是否涵盖了版本不支持和非法 JSON？ (对齐 `validate.ts`)
