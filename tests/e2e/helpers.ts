import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "test-admin@example.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("電郵").fill(ADMIN_EMAIL);
  await page.getByLabel("密碼").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
}

export async function chooseRadio(page: Page, questionId: string, label: string) {
  await page.locator(`[data-question="${questionId}"]`).getByLabel(label, { exact: true }).check();
}

export async function fillText(page: Page, questionId: string, value: string) {
  await page.locator(`[data-question="${questionId}"] input, [data-question="${questionId}"] textarea`).first().fill(value);
}

export async function checkConsent(page: Page, questionId: string, key: string) {
  await page.locator(`[data-question="${questionId}"] input[name="${questionId}.${key}"]`).check();
}

/**
 * Settings start empty in a freshly seeded database, and an empty setting means
 * its CTA is filtered off the success page. Tests that assert a settings-backed
 * CTA must establish the value themselves rather than rely on whatever the
 * database happens to hold.
 */
export async function setSetting(page: Page, key: string, value: string) {
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page.locator(`#${key}`).fill(value);
  await page.getByRole("button", { name: "儲存設定" }).click();
  await expect(page.locator(`#${key}`)).toHaveValue(value);
}
