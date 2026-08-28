import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'test-results/**', 'playwright-report/**', 'graphify-out/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.ts', 'tests/**/*.ts', '*.config.ts'] }
);
