import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the production build with the real model, downloads it once, then goes offline.
 * Needs network for the first load and ~100 MB of bandwidth, so it is not part of CI.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'real-model.spec.ts',
  timeout: 600_000,
  workers: 1,
  use: { baseURL: 'http://localhost:4174', ...devices['Pixel 7'] },
  webServer: {
    command: 'npm run build && npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
