import { expect, test } from "@playwright/test";
import { checkConsent, chooseRadio, fillText, setSetting } from "./helpers";

const CSC_INFO_URL = "https://example.com/TEST-csc-info";

test("community form: draft resume, submit, success CTA branch", async ({ page }) => {
  // C06 = CSC 課程資訊 shows a secondary CTA sourced from this setting.
  await setSetting(page, "csc_info_url", CSC_INFO_URL);

  await page.goto("/f/community?utm_source=ig&utm_medium=reel&cta=join_community&test=1");
  await expect(page.getByRole("heading", { name: "加入 Carey 創業資訊群前的 1 分鐘了解" })).toBeVisible();

  const name = `TEST E2E ${Date.now()}`;
  await fillText(page, "C01", name);
  await chooseRadio(page, "C02", "美容");
  await chooseRadio(page, "C03", "已營運但遇到瓶頸");

  // draft resume
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByText("已還原你上次未完成的答案")).toBeVisible();
  await expect(page.locator('[data-question="C01"] input')).toHaveValue(name);

  // validation gating
  await page.getByRole("button", { name: "取得加入連結" }).click();
  await expect(page.locator('[data-question="C04"]').getByRole("alert")).toHaveText("此題為必填");

  await chooseRadio(page, "C04", "客源與成交");
  await fillText(page, "C05", "穩定查詢");
  await chooseRadio(page, "C06", "CSC 課程資訊");
  await checkConsent(page, "C07", "application");
  await page.getByRole("button", { name: "取得加入連結" }).click();

  await expect(page).toHaveURL(/\/f\/community\/success\//);
  await expect(page.getByRole("heading", { name: /多謝你/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "了解 CSC 課程資訊" })).toBeVisible();

  // draft cleared
  await page.goto("/f/community");
  await expect(page.getByText("已還原你上次未完成的答案")).toHaveCount(0);
});
