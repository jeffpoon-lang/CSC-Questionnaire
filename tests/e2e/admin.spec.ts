import { expect, test } from "@playwright/test";
import { adminLogin, seedCommunitySubmission } from "./helpers";

test("admin: login, list, detail, status update, csv export, notion retry, logout", async ({ page, request }) => {
  await seedCommunitySubmission(request, "E2E Admin 種子");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await adminLogin(page);
  await expect(page.getByRole("heading", { name: /總覽/ })).toBeVisible();

  await page.goto("/admin/submissions?test=1");
  const first = page.locator("tbody tr a").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/admin\/submissions\/[A-Z0-9]+/);
  await expect(page.getByText("答案（按提交時的題目版本顯示）")).toBeVisible();

  await page.getByLabel("狀態").selectOption("reviewing");
  await page.getByLabel("Review owner").fill("E2E");
  await page.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByText("審閱中").first()).toBeVisible();

  await page.getByRole("button", { name: "重試同步" }).click();
  await expect(page.getByText(/NOTION_TOKEN not set|Notion database id not set|已同步/).first()).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.goto("/admin/submissions?test=1&form=community").then(() => page.getByRole("link", { name: /匯出 CSV/ }).click()),
  ]);
  expect(download.suggestedFilename()).toMatch(/csc-submissions-community/);

  await page.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("admin: wrong password is rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("電郵").fill("test-admin@example.com");
  await page.getByLabel("密碼").fill("wrong-password-123");
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page.getByText(/不正確/)).toBeVisible();
});
