import { defineConfig, devices } from '@playwright/test';

/** Fast end-to-end run against the deterministic engine; this is what CI executes. */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'hunt.spec.ts',
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'] },
  webServer: {
    command: 'npm run build:e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
