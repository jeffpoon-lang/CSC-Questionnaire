import { expect, test } from "@playwright/test";

/**
 * Staging-only Gate run for the admin items that need a real logged-in
 * session. Not part of `pnpm test:e2e` against local preview — run it with
 * E2E_BASE_URL pointing at staging and a throwaway TEST admin:
 *
 *   E2E_BASE_URL=https://... E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
 *     pnpm exec playwright test tests/e2e/staging-gate.spec.ts
 *
 * Runs serially: the lockout case deliberately locks the account, so it must
 * come after the case that needs to log in.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

test.describe.configure({ mode: "serial" });

test("gate 1 + 6: login, dashboard, CSV export, logout", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.getByLabel("電郵").fill(EMAIL);
  await page.getByLabel("密碼").fill(PASSWORD);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
  await expect(page.getByRole("heading", { name: /總覽/ })).toBeVisible();

  await page.goto("/admin/submissions");
  await expect(page.locator("tbody tr").first()).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /匯出 CSV/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/csc-submissions/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv.split("\n").length).toBeGreaterThan(1);

  await page.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("gate 1: wrong password is rejected, five failures lock the account", async ({ page }) => {
  await page.goto("/admin/login");

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.getByLabel("電郵").fill(EMAIL);
    await page.getByLabel("密碼").fill(`wrong-password-${attempt}`);
    await page.getByRole("button", { name: "登入" }).click();
    await expect(page.getByText(/電郵或密碼不正確/)).toBeVisible();
  }

  await page.getByLabel("電郵").fill(EMAIL);
  await page.getByLabel("密碼").fill("wrong-password-5");
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page.getByText(/鎖定|嘗試次數過多/)).toBeVisible();

  // The correct password is refused too while the lock holds.
  await page.getByLabel("電郵").fill(EMAIL);
  await page.getByLabel("密碼").fill(PASSWORD);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page.getByText(/15 分鐘/)).toBeVisible();
});
