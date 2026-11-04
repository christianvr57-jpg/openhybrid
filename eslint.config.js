import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'coverage']),
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    // Project rule: the engine is pure TypeScript and must run without a browser.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/engine must not depend on React.',
            },
            {
              group: ['**/features/**', '**/data/**', '**/i18n/**', '**/App*'],
              message: 'src/engine must not import from the UI or persistence layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/engine must not use browser APIs.' },
        { name: 'document', message: 'src/engine must not use browser APIs.' },
        { name: 'navigator', message: 'src/engine must not use browser APIs.' },
        { name: 'localStorage', message: 'src/engine must not use browser APIs.' },
        { name: 'indexedDB', message: 'src/engine must not use browser APIs.' },
      ],
    },
  },
  prettier,
])
