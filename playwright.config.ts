import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: !!process.env.CI,
    launchOptions: {
      slowMo: process.env.CI ? 0 : 400,
    },
    trace: 'retain-on-failure',
  },
  workers: 1,
  webServer: [
    {
      command: 'npm start',
      cwd: 'server',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      cwd: 'client',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
