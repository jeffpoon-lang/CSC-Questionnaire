import { expect, test } from "@playwright/test";
import { checkConsent, chooseRadio, fillText, openQuestion, submitForm } from "./helpers";

test("generic csc: dynamic G09 from G08, max 3, diagnosis note on success", async ({ page }) => {
  await page.goto("/f/generic_csc?src=instagram");
  await expect(page.locator('[data-question="G09"]')).toHaveCount(0);

  await fillText(page, "G01", "TEST Generic");
  await fillText(page, "G02", "+852 9123 4567");
  await fillText(page, "G03", `test-generic-${Date.now()}@example.com`);
  await fillText(page, "G04", "Hong Kong");
  await chooseRadio(page, "G05", "美容");
  await chooseRadio(page, "G06", "營運中，但遇到瓶頸");
  await chooseRadio(page, "G07", "2–5 人");

  await openQuestion(page, "G08");
  const g08 = page.locator('[data-question="G08"]');
  await g08.getByLabel("客源與成交", { exact: true }).check();
  await g08.getByLabel("客人講價與利潤", { exact: true }).check();
  await g08.getByLabel("定位與方向", { exact: true }).check();
  await expect(g08.getByLabel("品牌吸引力", { exact: true })).toBeDisabled();

  await openQuestion(page, "G09");
  const g09 = page.locator('[data-question="G09"]');
  await expect(g09).toBeVisible();
  await expect(g09.getByRole("radio")).toHaveCount(4); // 3 selected + 其他
  await g09.getByLabel("客源與成交", { exact: true }).check();

  await fillText(page, "G10", "情況");
  await fillText(page, "G11", "90 日目標");
  await fillText(page, "G12", "願景");
  await chooseRadio(page, "G14", "2–5 小時");
  await openQuestion(page, "G15");
  await page.locator('[data-question="G15"]').getByLabel("商業框架與吸客留客", { exact: true }).check();
  await chooseRadio(page, "G17", "策略診斷");
  // G18 prefilled from ?src=instagram
  await openQuestion(page, "G18");
  await expect(page.locator('[data-question="G18"]').getByLabel("Instagram", { exact: true })).toBeChecked();
  await checkConsent(page, "G19", "application");
  await submitForm(page, "提交");

  await expect(page).toHaveURL(/\/f\/generic_csc\/success\//);
  await expect(page.getByText("團隊將先閱讀你的資料")).toBeVisible();
  await expect(page.getByRole("link", { name: "了解 CSC 課程資訊" })).toHaveCount(0);
});
