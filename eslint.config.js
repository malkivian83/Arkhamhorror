import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs-proyecto/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // Variables con prefijo _ se descartan a propósito (p. ej. al desestructurar).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Passenger's startup files use CommonJS to preserve its server hook.
    files: ['app.cjs', 'tools/run-deploy.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // El motor debe ser puro y determinista: sin E/S, reloj ni azar global.
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'fetch', 'setTimeout', 'setInterval'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Usa el RNG con semilla del motor.' },
        { object: 'Date', property: 'now', message: 'El motor no depende del reloj.' },
      ],
      'no-restricted-imports': ['error', { patterns: ['node:*', 'fs', 'path', 'http'] }],
    },
  },
  prettier,
)
