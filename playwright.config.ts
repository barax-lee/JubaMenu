import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  timeout: 60000,
  use: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true },
});
