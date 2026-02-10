# 提示词生成区格式切换与多模板渲染计划

## TL;DR

> **Quick Summary**: 在中间「提示词生成」区域增加格式切换（Markdown / YAML / XML），位置放在复制按钮左侧；输出与复制内容都严格跟随当前选中格式。
>
> **Deliverables**:
> - 中间区域新增格式切换控件（默认 Markdown）
> - `buildPromptText` 升级为多格式生成器
> - 三种模板落地并补齐 TDD（单测 + 交互 + E2E）
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO（顺序执行更稳妥）
> **Critical Path**: 格式规则定义 → 生成器改造 → UI 接线 → 回归测试

---

## Context

### Original Request
- 增强中间「提示词生成」区域。
- 在复制按钮左侧增加类型切换（markdown、yaml、xml）。
- markdown / yaml 模板已给定，xml 由规划补充。
- 用户补充：位置也可考虑右下/左下；最终确认采用顶部复制按钮左侧。

### Interview Summary
**已确认决策**:
- 控件位置：顶部工具区，复制按钮左侧。
- 默认类型：Markdown。
- YAML / XML 每条 snippet 保留末尾分号 `;`。
- 测试策略：TDD。

**模板基准**:
- Markdown：
  - `## {group}`
  - 每条 snippet 单独一行
  - 组间空一行
- YAML：
  - 组名为 key
  - value 为 snippet 列表（`- xxx;`）

### Metis Review
**识别并已在计划中吸收的点**:
1. **YAML/XML 结构歧义**：
   - 已定：YAML 采用用户示例的 list 结构；XML 采用对等 list 结构（`<group><snippet>...</snippet></group>`）。
2. **UI 拥挤风险**：
   - 采用现有 `Tabs` 轻量分段控件，并保持紧凑尺寸。
3. **避免逻辑散落**：
   - 格式拼装逻辑集中在 `buildPromptText`，组件仅做状态与调用。

---

## Work Objectives

### Core Objective
在不改变现有片段数据模型与排序语义的前提下，实现「可切换格式的提示词生成与复制」，并通过 TDD 与 E2E 保证回归安全。

### Concrete Deliverables
- `src/components/promptText/PromptTextPanel.tsx`：新增格式切换控件与状态联动。
- `src/components/promptText/buildPromptText.ts`：新增格式参数并实现 markdown/yaml/xml 生成。
- `src/components/promptText/buildPromptText.test.ts`：扩展三格式与边界用例。
- `e2e/prompt-text.spec.ts`：扩展格式切换与复制断言。

### Definition of Done
- [x] `buildPromptText` 支持 `markdown | yaml | xml`，并保留原有空组过滤与顺序规则。
- [x] UI 默认 Markdown，切换后文本实时更新。
- [x] 点击复制后，剪贴板内容与当前格式文本完全一致。
- [x] 单测与 E2E 全部通过：
  - `npm run test -- src/components/promptText/buildPromptText.test.ts`
  - `npm run e2e -- e2e/prompt-text.spec.ts`

### Must Have
- 位置：切换控件在复制按钮左侧。
- 默认格式：Markdown。
- YAML/XML 每条 snippet 保留 `;`。
- XML 模板采用如下结构（本次补充）：

```xml
<prompts>
  <group name="{group}">
    <snippet>{snippet1};</snippet>
    <snippet>{snippet2};</snippet>
  </group>
  <group name="{group2}">
    <snippet>{snippet3};</snippet>
  </group>
</prompts>
```

### Must NOT Have (Guardrails)
- 不改动 `FragmentState` / store 数据结构。
- 不新增第三方依赖（YAML/XML 以字符串模板生成）。
- 不把格式切换放到底部（已确认顶部左侧）。
- 不做本次范围外持久化（刷新后仍默认 Markdown）。
- 不改动左右面板功能。

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> 所有验收均由执行代理完成，不依赖人工点击或人工目测。

### Test Decision
- **Infrastructure exists**: YES（Vitest + Playwright）
- **Automated tests**: TDD
- **Framework**: vitest + playwright

### TDD Workflow (for each implementation task)
1. **RED**：先写失败测试（新格式/新交互）
2. **GREEN**：最小实现通过测试
3. **REFACTOR**：整理实现，测试持续绿

### Agent-Executed QA Scenarios (applies to all tasks)
- Frontend/UI：Playwright
- 逻辑验证：Vitest（CLI）
- 复制验证：Playwright 读取 clipboard

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1:
└── Task 1: 多格式生成器规则 + 单测（TDD）

Wave 2 (after Wave 1):
└── Task 2: 面板格式切换 UI + 复制联动（TDD）

Wave 3 (after Wave 2):
└── Task 3: E2E 回归扩展（格式切换与复制）

Critical Path: Task 1 → Task 2 → Task 3
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `task(category="quick", load_skills=["frontend-ui-ux"], run_in_background=false)` |
| 2 | 2 | `task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false)` |
| 3 | 3 | `task(category="quick", load_skills=["playwright"], run_in_background=false)` |

---

## TODOs

- [x] 1. 多格式生成器改造（TDD）

  **What to do**:
  - RED：为 `buildPromptText` 增加格式参数测试（markdown/yaml/xml）。
  - GREEN：将函数签名升级为：
    - `buildPromptText(fragments, format)`
  - 更新全项目调用点，至少覆盖中间面板与 SDK demo 等现有引用，避免 typecheck 失败。
  - 实现三种输出：
    - Markdown：`## {group}` + 每条 snippet 一行（保留 `;`）+ 组间空行。
    - YAML：
      - `{group}:`
      - ` - {snippet};`
    - XML：
      - `<prompts><group name="..."><snippet>...;</snippet></group></prompts>`
  - 保持：空组/空 prompt 过滤、groupOrder 与 promptIds 顺序。
  - REFACTOR：抽取内部 format renderer，避免 if-else 膨胀。

  **Must NOT do**:
  - 不修改 `FragmentState` 类型。
  - 不将格式逻辑散落到 UI 组件。

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件逻辑重构 + 单测驱动，边界清晰。
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 保证输出文本可读性与格式一致性（尤其换行/间距规范）。
  - **Skills Evaluated but Omitted**:
    - `playwright`: 本任务以纯函数逻辑与单测为主，不需要浏览器自动化。

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/components/promptText/buildPromptText.ts:1-43`
    - 当前单格式实现基线；保留过滤与顺序语义。
  - `src/components/promptText/buildPromptText.test.ts:8-79`
    - 现有测试写法与断言风格，作为新增格式测试模板。
  - `src/domain/types.ts:24-32`
    - `FragmentState` 合同定义，确保函数签名与字段访问正确。
  - `src/sdk/demo/HostSdkIntegrationDemo.tsx`（全文件搜索 `buildPromptText(`）
    - 改签名后的潜在调用点，需同步更新传参或提供默认值。

  **Acceptance Criteria**:
  - [x] RED：新增三格式测试后，初次执行失败。
  - [x] GREEN：`npm run test -- src/components/promptText/buildPromptText.test.ts` 通过。
  - [x] Markdown 输出符合新模板：组标题下每条 snippet 独立一行，组间空一行。
  - [x] YAML 输出为组 → 列表结构，每条 snippet 带 `;`。
  - [x] XML 输出包含根节点 `<prompts>` 与 `<group name="...">` / `<snippet>`。
  - [x] `npm run typecheck` 通过（无遗漏调用点导致的 TS 错误）。

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: 纯函数三格式输出回归
    Tool: Bash (Vitest)
    Preconditions: 依赖已安装
    Steps:
      1. 运行: npm run test -- src/components/promptText/buildPromptText.test.ts
      2. 断言: 输出包含 "buildPromptText" 测试套件
      3. 断言: 失败数为 0
    Expected Result: 三格式与边界测试全部通过
    Failure Indicators: 任一 case fail / snapshot mismatch
    Evidence: 终端输出保存到 .sisyphus/evidence/task-1-vitest.txt

  Scenario: 空组与空内容过滤（负向）
    Tool: Bash (Vitest)
    Preconditions: 测试用例含空组、空白内容
    Steps:
      1. 运行同上命令
      2. 断言: YAML/XML/Markdown 输出均不包含空组 key/tag
    Expected Result: 空数据被过滤，不产生脏输出
    Failure Indicators: 出现空组或空 snippet
    Evidence: 同上终端输出
  ```

  **Commit**: YES
  - Message: `feat(prompt-text): add multi-format prompt renderer with tdd`
  - Files: `src/components/promptText/buildPromptText.ts`, `src/components/promptText/buildPromptText.test.ts`
  - Pre-commit: `npm run test -- src/components/promptText/buildPromptText.test.ts`

---

- [x] 2. 中间面板增加格式切换并联动复制（TDD）

  **What to do**:
  - RED：先补组件行为测试（或先补 e2e 中局部断言）定义“切换即更新文本、复制取当前格式”。
  - GREEN：在 `PromptTextPanel` 增加 `format` 本地状态（默认 `markdown`）。
  - 在头部区域复制按钮左侧插入 3 选项切换（优先复用 `Tabs` + `TabsList` + `TabsTrigger`）。
  - `useMemo` 调用 `buildPromptText(fragments, format)`。
  - 复制按钮继续复用现有逻辑，但复制内容必须是当前 `promptText`。
  - 新增 test id（建议）：
    - `prompt-text-format-markdown`
    - `prompt-text-format-yaml`
    - `prompt-text-format-xml`
  - REFACTOR：整理 header 布局，避免标题/切换/复制按钮拥挤。

  **Must NOT do**:
  - 不引入新 UI 库。
  - 不改变空态文案与复制按钮禁用逻辑。

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及 UI 结构、可用性与交互反馈。
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 确保控件布局与视觉层级清晰。
  - **Skills Evaluated but Omitted**:
    - `playwright`: 本任务优先完成组件实现，端到端留给 Task 3。

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/components/promptText/PromptTextPanel.tsx:8-57`
    - 当前中间面板结构、复制按钮位置与 testid。
  - `src/components/ui/Tabs.tsx:9-79`
    - 可直接复用的受控切换组件。
  - `src/components/ui/Button.tsx:39-66`
    - `IconButton` 样式体系，保证按钮风格一致。

  **Acceptance Criteria**:
  - [x] 默认选中 Markdown，且初始渲染不回归。
  - [x] 点击 YAML 后展示 YAML 模板文本（不含 `##` 标记）。
  - [x] 点击 XML 后展示 XML 模板文本（包含 `<prompts>`）。
  - [x] 点击复制后，剪贴板文本与当前面板文本一致。
  - [x] 空态下复制按钮依旧禁用。

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: 切换到 YAML 后文本立即切换
    Tool: Playwright
    Preconditions: localhost:5173 已启动；存在至少一个组与一个 snippet
    Steps:
      1. 打开 http://localhost:5173/
      2. 创建分组 "Group A"，新增片段 "Hello Prompt"
      3. 点击 data-testid="prompt-text-format-yaml"
      4. 断言 data-testid="prompt-text" 包含 "Group A:" 和 "- Hello Prompt;"
      5. 断言 data-testid="prompt-text" 不包含 "##Group A"
      6. 截图 .sisyphus/evidence/task-2-yaml-view.png
    Expected Result: 文本区渲染 YAML 模板
    Failure Indicators: 仍显示 Markdown 或内容未更新
    Evidence: .sisyphus/evidence/task-2-yaml-view.png

  Scenario: 切换到 XML 后复制值匹配（正向）
    Tool: Playwright
    Preconditions: 同上
    Steps:
      1. 点击 data-testid="prompt-text-format-xml"
      2. 断言文本包含 "<prompts>"、"<group name=\"Group A\">"、"<snippet>Hello Prompt;</snippet>"
      3. 点击 data-testid="prompt-text-copy"
      4. 读取 clipboard
      5. 断言 clipboard 与 data-testid="prompt-text" 文本完全一致
      6. 截图 .sisyphus/evidence/task-2-xml-copy.png
    Expected Result: 复制内容与 XML 视图一致
    Failure Indicators: 复制内容仍为 Markdown/YAML 或缺失标签
    Evidence: .sisyphus/evidence/task-2-xml-copy.png

  Scenario: 空态时复制按钮禁用（负向）
    Tool: Playwright
    Preconditions: 初始无片段
    Steps:
      1. 打开首页
      2. 断言 data-testid="prompt-text-copy" 为 disabled
      3. 点击任一格式按钮后再次断言 disabled
    Expected Result: 空态下无论格式如何都不可复制
    Failure Indicators: 按钮可点或触发复制成功提示
    Evidence: .sisyphus/evidence/task-2-empty-disabled.png
  ```

  **Commit**: YES
  - Message: `feat(prompt-text): add format switch beside copy action`
  - Files: `src/components/promptText/PromptTextPanel.tsx`
  - Pre-commit: `npm run test -- src/components/promptText/buildPromptText.test.ts`

---

- [x] 3. E2E 回归覆盖三格式切换与复制链路

  **What to do**:
  - 在 `e2e/prompt-text.spec.ts` 扩展现有 case 或新增 case：
    - 覆盖 Markdown/YAML/XML 三种渲染签名。
    - 覆盖切换后复制结果一致性。
    - 覆盖负向（空态禁用复制）。
  - 确保断言使用稳定定位（`data-testid` 优先）。

  **Must NOT do**:
  - 不使用脆弱的纯文本全局定位替代 testid。
  - 不引入人工步骤。

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件 E2E 场景扩展，改动边界明确。
  - **Skills**: [`playwright`]
    - `playwright`: 高置信执行浏览器交互和剪贴板断言。
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 本任务以自动化验证为主，不是视觉重构。

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `e2e/prompt-text.spec.ts:3-44`
    - 已有中间面板回归路径（创建组、加入片段、复制并读剪贴板）。
  - `src/components/promptText/PromptTextPanel.tsx:51-55`
    - 文本容器 `data-testid="prompt-text"`。
  - `src/components/promptText/PromptTextPanel.tsx:32-41`
    - 复制按钮 `data-testid="prompt-text-copy"`。

  **Acceptance Criteria**:
  - [x] `npm run e2e -- e2e/prompt-text.spec.ts` 通过。
  - [x] 三格式切换均有明确断言（Markdown 标记 / YAML 列表 / XML 标签）。
  - [x] 每种格式至少 1 条复制一致性断言。
  - [x] 负向路径（空态禁用复制）被验证。

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: 三格式切换签名断言
    Tool: Playwright
    Preconditions: 测试用户流程可创建 Group A + Hello Prompt
    Steps:
      1. 进入页面并准备数据
      2. 点击 markdown 按钮 -> 断言包含 "##Group A" 与 "Hello Prompt;"
      3. 点击 yaml 按钮 -> 断言包含 "Group A:" 与 "- Hello Prompt;"
      4. 点击 xml 按钮 -> 断言包含 "<prompts>" 与 "<snippet>Hello Prompt;</snippet>"
    Expected Result: 每次切换文本都匹配对应模板签名
    Failure Indicators: 格式串台、未更新、缺少关键标记
    Evidence: .sisyphus/evidence/task-3-format-signatures.png

  Scenario: 复制内容与当前视图一致（负向含切换）
    Tool: Playwright
    Preconditions: 同上
    Steps:
      1. 切到 yaml 并复制，读取 clipboard，断言与 prompt-text 完全一致
      2. 切到 xml 并复制，重复断言
      3. 清空片段区后断言复制按钮 disabled
    Expected Result: 始终复制当前选中格式，空态不可复制
    Failure Indicators: 复制滞后旧格式 / 空态仍可复制
    Evidence: .sisyphus/evidence/task-3-copy-consistency.png
  ```

  **Commit**: YES
  - Message: `test(e2e): cover prompt text format switching and copy consistency`
  - Files: `e2e/prompt-text.spec.ts`
  - Pre-commit: `npm run e2e -- e2e/prompt-text.spec.ts`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(prompt-text): add multi-format prompt renderer with tdd` | `buildPromptText.ts`, `buildPromptText.test.ts` | `npm run test -- src/components/promptText/buildPromptText.test.ts` |
| 2 | `feat(prompt-text): add format switch beside copy action` | `PromptTextPanel.tsx` | `npm run test -- src/components/promptText/buildPromptText.test.ts` |
| 3 | `test(e2e): cover prompt text format switching and copy consistency` | `e2e/prompt-text.spec.ts` | `npm run e2e -- e2e/prompt-text.spec.ts` |

---

## Success Criteria

### Verification Commands

```bash
npm run typecheck
npm run test -- src/components/promptText/buildPromptText.test.ts
npm run e2e -- e2e/prompt-text.spec.ts
```

### Final Checklist
- [x] 中间区域可在 Markdown/YAML/XML 三种格式间切换。
- [x] 切换控件位置位于复制按钮左侧。
- [x] 默认格式为 Markdown。
- [x] YAML/XML 每条 snippet 保留 `;`。
- [x] 复制内容始终与当前格式视图一致。
- [x] 单测与 E2E 通过。
