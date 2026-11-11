import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests: a real browser uses the built site, which talks to the
 * real backend. Only the AI model is replaced by a stand-in (PROVIDER=fake),
 * so the tests need no key, cost nothing and always get the same answer.
 *
 * Settings from the environment:
 *   E2E_PYTHON   the Python that has the backend's libraries (default: python)
 *   E2E_CHANNEL  "chrome" to use an installed Google Chrome instead of
 *                Playwright's own browser download
 */
const SITE = 'http://127.0.0.1:4173'
const API_PORT = 8123 // must match frontend/.env.e2e
const python = process.env.E2E_PYTHON ?? 'python'
const channel = process.env.E2E_CHANNEL

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: SITE, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    {
      name: 'phone',
      // A phone-sized Chromium window with touch, 390 px wide.
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, channel },
    },
  ],
  webServer: [
    {
      command: `${python} -m uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT} --no-access-log`,
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        PROVIDER: 'fake',
        // A short pause between the pieces of the answer, like a real model.
        FAKE_PIECE_DELAY_MS: '150',
        ALLOWED_ORIGINS: SITE,
        // The tests ask many questions quickly; the real limits have their own tests.
        REQUESTS_PER_MINUTE: '100000',
        REQUESTS_PER_HOUR: '100000',
        REQUESTS_PER_DAY: '100000',
      },
    },
    {
      command: 'npm run build:e2e && npm run preview:e2e',
      cwd: '../frontend',
      url: SITE,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
