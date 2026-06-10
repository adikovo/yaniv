import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    launchOptions: {
      slowMo: 400,
    },
  },
  workers: 1,
});
