import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['LIVE_BASE_URL'];
if (!baseURL || new URL(baseURL).protocol !== 'https:')
  throw new Error('Set LIVE_BASE_URL to the deployed production HTTPS URL.');

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'production.spec.ts',
  fullyParallel: true,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'live-desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'live-mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
        viewport: { width: 320, height: 900 },
      },
    },
  ],
});
