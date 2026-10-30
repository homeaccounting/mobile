const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  { ignores: ['node_modules', 'ios', 'android', '.expo', 'dist', 'coverage'] },
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
  },
  {
    files: ['eslint.config.js', 'babel.config.js', 'metro.config.js', 'tailwind.config.js'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  {
    // Maestro's GraalJS runtime: env vars and its http/json/output helpers.
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: { http: 'readonly', json: 'readonly', output: 'writable', API_URL: 'readonly' },
    },
  },
]);
