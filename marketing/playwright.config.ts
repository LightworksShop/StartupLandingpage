import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  timeout: 30000, retries: 0,
  outputDir: './var/test-results',
  use: { baseURL: 'http://127.0.0.1:4319', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run build:marketing && node --import tsx marketing/tests/serve.cjs', cwd: process.cwd(), url:'http://127.0.0.1:4319/health', reuseExistingServer:false, timeout:60000 },
});
