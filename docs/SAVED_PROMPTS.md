# 成品库 (Saved Prompts) 说明文档

本文档说明“成品库”的功能行为、数据结构与实现细节。

## 1. 功能概览

成品库位于右侧边栏的“成品库”标签页。它允许用户将当前“片段区 (Fragments)”的结构快照保存下来，以便日后一键恢复。

### 核心行为
- **保存内容**：保存的是片段区的完整结构（分组、片段顺序、内容），**不保存**中栏预览区域生成的最终合并文本。
- **加载逻辑**：加载成品会 **完全替换** 当前片段区的内容。该操作不可逆（除非手动撤销或重新组合），加载后会立即触发持久化。
- **搜索与筛选**：
  - **搜索框**：按名称或标签进行模糊匹配（不区分大小写）。
  - **标签筛选**：支持多选标签。筛选逻辑为 **OR**（只要成品包含选中的任意一个标签即可显示）。

## 2. 数据结构

成品库数据存储在 `AppState.savedPrompts` 切片中，采用规范化（Normalized）结构。

### AppState 切片
```typescript
interface AppState {
  // ... 其他字段
  savedPrompts: {
    order: SavedPromptId[]; // 存储 ID 列表，用于控制显示顺序（默认按更新时间倒序）
    items: Record<SavedPromptId, SavedPrompt>; // 以 ID 为 Key 的成品对象映射
  }
}
```

### SavedPrompt 对象
```typescript
interface SavedPrompt {
  id: SavedPromptId;        // 唯一 ID (格式：saved-prompt-xxx)
  name: string;             // 成品名称 (必填，唯一)
  tags: string[];           // 标签数组 (已去重、去空、去空格)
  snapshot: FragmentState;  // 片段区结构的深度克隆快照 (PromptCollectionState)
  createdAt: string;        // ISO 8601 创建时间
  updatedAt: string;        // ISO 8601 最后更新时间
}
```

## 3. 业务规则与限制

### 命名规则
- **去空格**：保存前会自动执行 `name.trim()`。
- **非空检查**：名称不能为空。
- **唯一性**：成品名称必须全局唯一。判重逻辑为 `name.trim()` 大小写敏感匹配。若冲突将抛出 `ValidationError`。

### 标签规则
- **格式**：保存时通过逗号分隔（如 `创作, 周报, 英文`）。
- **清理**：系统会自动进行 `trim()` 处理，剔除空字符串，并移除重复标签。
- **编辑**：用户可以在成品卡片上直接点击标签区域进入编辑模式。

### 删除交互
- **二次确认**：点击删除图标后，按钮会变为“确认删除”并进入倒计时状态。
- **超时重置**：3 秒内未点击确认，则恢复初始状态。
- **取消**：按 `Esc` 键可立即退出删除确认状态。

### 持久化与迁移
- **存储**：成品库数据随 `AppState` 一起持久化在 `localStorage` 中。
- **版本**：当前 `SCHEMA_VERSION` 为 `1`。
- **兼容性**：若旧数据中缺失 `savedPrompts` 字段，系统在加载时会自动初始化为空集合 `{ order: [], items: {} }`。

## 4. 数据示例 (JSON)

以下是 `savedPrompts` 在 `AppState` 中的实际存储样例：

```json
{
  "savedPrompts": {
    "order": ["saved-prompt-123"],
    "items": {
      "saved-prompt-123": {
        "id": "saved-prompt-123",
        "name": "周报生成模板",
        "tags": ["工作", "周报"],
        "snapshot": {
          "groupOrder": ["fragments-g-456"],
          "groups": {
            "fragments-g-456": {
              "id": "fragments-g-456",
              "name": "基本信息",
              "promptIds": ["fragments-p-789"],
              "collapsed": false
            }
          },
          "prompts": {
            "fragments-p-789": {
              "id": "fragments-p-789",
              "content": "本周工作总结：",
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-01T00:00:00.000Z"
            }
          }
        },
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T10:30:00.000Z"
      }
    }
  }
}
```

## 5. 设计约束 (Guardrails)

1. **不保存预览**：成品库仅保存结构。如果片段内容引用的外部变量发生变化，加载后的成品预览也会随之变化。
2. **非导入导出**：v1 版本不提供成品库的独立 JSON 导入导出功能；当前 JSON 导入导出仅覆盖右栏片段库（Library）。若需要迁移/备份成品库，当前方式是备份浏览器 `localStorage` 中的 `llm_prompt_panel_state`（可通过开发者工具导出）。
3. **无版本历史**：每个成品仅保存当前状态，不支持回溯之前的保存记录。
4. **无云同步**：数据仅存在于当前浏览器的本地存储中，清除缓存会导致数据丢失。

---

## 与代码一致性自检 Checklist

- [x] `AppState` 是否包含 `savedPrompts` 字段？ (参考 `types.ts`)
- [x] `SavedPrompt` 的 `snapshot` 是否为 `PromptCollectionState`？ (参考 `types.ts`)
- [x] 加载行为是否为替换而非合并？ (参考 `actions.ts -> loadSavedPromptToFragments`)
- [x] 命名唯一性检查是否已实现？ (参考 `actions.ts -> ensureSavedPromptNameUnique`)
- [x] 删除确认逻辑是否包含超时和 Esc 退出？ (参考 `SavedPromptItem.tsx`)
- [x] 标签处理是否包含去空去重？ (参考 `actions.ts -> normalizeTags`)
