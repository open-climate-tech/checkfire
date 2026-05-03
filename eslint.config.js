// ESLint flat config (ESLint 9+)
// eslint-config-next@16.2.4 exports a flat config array directly.
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

module.exports = [
  // Global ignores (replaces .eslintignore / ignorePatterns)
  {
    ignores: [
      'build/**',
      'dist/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'cypress/**',
      'test/**',
      'server-main.ts',
      'server-src/**',
    ],
  },
  // next/core-web-vitals flat config (already targets **/*.{js,jsx,ts,tsx,...})
  ...nextCoreWebVitals,
  // Project-specific rule overrides
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
