# Prompt Editor SDK

A React SDK for integrating the Prompt Editor UI into your host application.

## Installation

```bash
npm install @xgfan/prompt-editor
# or
yarn add @xgfan/prompt-editor
# or
pnpm add @xgfan/prompt-editor
```

## Usage

### 1. Import Styles

Import the CSS file in your root entry point (e.g., `main.tsx` or `App.tsx`):

```tsx
import "@xgfan/prompt-editor/style.css";
```

### 2. Use the Component

```tsx
import { PromptEditorSDK } from "@xgfan/prompt-editor";

function App() {
  const handleSave = (data: any) => {
    console.log("Saved prompt data:", data);
  };

  return (
    <div style={{ height: "100vh" }}>
      <PromptEditorSDK
        initialData={null}
        onSave={handleSave}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `initialData` | `PromptData \| null` | Initial prompt data to load into the editor. |
| `onSave` | `(data: PromptData) => void` | Callback fired when the user saves the prompt. |
| `readOnly` | `boolean` | (Optional) If true, the editor is in read-only mode. |

## License

MIT
