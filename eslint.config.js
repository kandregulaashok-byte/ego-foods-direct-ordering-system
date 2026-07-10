import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        AudioContext: 'readonly',
        BrowserWindow: 'readonly',
        Buffer: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        localStorage: 'readonly',
        performance: 'readonly',
        process: 'readonly',
        requestAnimationFrame: 'readonly',
        require: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'error'
    }
  }
];
