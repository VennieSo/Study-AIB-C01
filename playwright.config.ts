import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['PLAYWRIGHT_PORT'] ?? 4321);
const url = (offset = 0) => `http://127.0.0.1:${port + offset}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: url(), trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      testIgnore: 'production.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'mobile',
      testIgnore: 'production.spec.ts',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
      },
    },
    {
      name: 'production',
      testMatch: 'production.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: url(1),
      },
    },
    {
      name: 'static-preview',
      testIgnore: 'production.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: url(2),
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${port} --ignore-lock`,
      url: url(),
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port + 1} --ignore-lock`,
      url: url(1),
      reuseExistingServer: false,
    },
    {
      command: `npm run build:fixtures && npm run preview:fixtures -- --host 127.0.0.1 --port ${port + 2} --ignore-lock`,
      url: url(2),
      reuseExistingServer: false,
    },
  ],
});
