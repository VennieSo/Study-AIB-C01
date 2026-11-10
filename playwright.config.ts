import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
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
        baseURL: 'http://127.0.0.1:4322',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4321 --ignore-lock',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: !process.env['CI'],
    },
    {
      command:
        'npm run build && npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock',
      url: 'http://127.0.0.1:4322',
      reuseExistingServer: false,
    },
  ],
});
