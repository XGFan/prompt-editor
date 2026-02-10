import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-sdk',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/sdk/index.ts'),
      name: 'PromptEditorSDK',
      formats: ['es', 'cjs'],
      cssFileName: 'style',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs')
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
