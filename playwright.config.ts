import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173', browserName: 'chromium' },
  // Claim commands are required to work immediately after `npm ci`, when a
  // clean checkout has no dist directory for Vite preview to serve.
  webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: true },
  reporter: 'list'
});
