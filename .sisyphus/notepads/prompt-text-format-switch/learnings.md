## 2026-02-10T14:59:38.719Z Task: initialization
- Notepad initialized for prompt-text-format-switch plan.
- Pending: capture conventions, patterns, and stable selectors during execution.
# Learnings - Task 1

- **TDD Implementation**: Successfully implemented multiple format support (Markdown, YAML, XML) in `buildPromptText` using a TDD approach.
- **Markdown Formatting**: Changed the default Markdown format to have each snippet on its own line under the group title, which improves readability.
- **Compatibility**: The function signature change (adding an optional `format` parameter) maintains backward compatibility with existing call sites.
- **Consistency**: All formats consistently include the trailing semicolon `;` for each snippet, as requested.

# Learnings - Task 2

- **UI Implementation**: Successfully integrated `Tabs` component for format switching in `PromptTextPanel`.
- **Component Testing**: Used `@testing-library/react` to test `PromptTextPanel` behavior, including format switching and copy functionality. Mocked dependencies like `useAppStoreSelector` and `navigator.clipboard`.
- **Layout**: Placed the format switcher to the left of the copy button as requested, grouping them logically.
- **State Management**: Managed format state locally within `PromptTextPanel` using `useState`.

# Learnings - Task 3

- **E2E Coverage**: Expanded `prompt-text.spec.ts` to cover all three formats (Markdown, YAML, XML) and verified their content and clipboard consistency.
- **Clipboard Testing**: Used `page.evaluate(() => navigator.clipboard.readText())` with granted permissions to reliably assert clipboard content in Playwright.
- **Negative Testing**: Verified that the copy button remains disabled in all formats when the snippet area is empty.
- **Test Stability**: Used stable `data-testid` selectors for format tabs and the copy button to ensure test resilience.
