import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      STORAGE_MODE: 'local', ASHT_DATA_DIR: '.test-data',
      ADMIN_USERNAME: 'editor-test', ADMIN_PASSWORD: 'test-password-not-for-deployment',
      SESSION_SECRET: 'test-only-session-secret-at-least-thirty-two-characters',
    },
  },
});
