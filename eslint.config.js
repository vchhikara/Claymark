import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'src-tauri/**', '.scratch/**'] },
  ...tseslint.configs.recommended,
  {
    // DEF-004: src/components/MermaidDiagram.tsx and
    // src/hooks/useStreamingMarkdown.ts each carry a justified
    // eslint-disable comment for react/no-danger and
    // react-hooks/exhaustive-deps respectively, but neither plugin was
    // ever installed/configured — ESLint reported "Definition for rule
    // not found" for both, which is a config gap, not evidence the
    // underlying code is fine either way.
    files: ['**/*.{ts,tsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooksPlugin },
    rules: {
      'react/no-danger': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
