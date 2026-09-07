import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// The remote environment ships a Chromium at /opt/pw-browsers/chromium; use it
// when present instead of downloading a browser.
const localChromium = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium/chrome"].find((p) => existsSync(p));

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8787";

// Against a remote base URL the browser has to go through the same egress
// proxy as every other tool here, or it gets ERR_CONNECTION_RESET. Local
// preview runs stay direct.
const isRemote = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseURL);
const proxyServer = process.env.HTTPS_PROXY ?? process.env.https_proxy;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    proxy: isRemote && proxyServer ? { server: proxyServer } : undefined,
    launchOptions: localChromium && !existsSync(`${localChromium}/.`) ? { executablePath: localChromium } : undefined,
  },
});
