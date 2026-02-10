## 2026-02-10T14:59:38.719Z Task: initialization
- Known watch item: buildPromptText signature change likely impacts additional call sites (e.g., SDK demo).
# Issues - Task 1

- **Call Sites**: No breaking changes found in `PromptTextPanel.tsx` or `HostSdkIntegrationDemo.tsx` since the default format remains `markdown` and the new parameter is optional.
- **Visual Change**: The change in Markdown output (one line per snippet) will be visible to users immediately. This matches the new design requirement.

# Issues - Task 2

- **Testing Difficulties**: Initial trouble with `edit` tool caused test failures due to file not updating correctly. Resolved by using `edit` with correct parameters.
- **Text Content Mismatch**: Markdown format generated `##Group` (no space) while test expected `## Group`. Updated test expectation to match implementation.

# Issues - Task 3

- **Clipboard Permissions**: Required `context.grantPermissions(['clipboard-read', 'clipboard-write'])` in `test.beforeEach` to allow Playwright to access the system clipboard, which was already in place but critical for the new assertions.
- **Formatting Nuances**: Asserting exact whitespace/newlines in XML and YAML requires careful string matching. Used `\n` and spaces consistently to match `buildPromptText` implementation.
