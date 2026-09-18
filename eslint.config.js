import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'desktop/**', 'android/**', 'web-extension/**', '.scratch/**'] },
  ...tseslint.configs.recommended,
)
