import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// The remote environment ships a Chromium at /opt/pw-browsers/chromium; use it
// when present instead of downloading a browser.
const localChromium = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium/chrome"].find((p) => existsSync(p));

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8787",
    headless: true,
    launchOptions: localChromium && !existsSync(`${localChromium}/.`) ? { executablePath: localChromium } : undefined,
  },
});
