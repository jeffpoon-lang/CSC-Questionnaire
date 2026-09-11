import { expect, test } from "@playwright/test";
import { checkConsent, chooseRadio, fillText, nextPage, openQuestion, prevPage, submitForm } from "./helpers";

test("high ticket: Q27 conditional on Q24, message-only success", async ({ page }) => {
  await page.goto("/f/high_ticket");
  await fillText(page, "Q01", "TEST Founder");
  await fillText(page, "Q02", "TEST Brand");
  await chooseRadio(page, "Q03", "創辦人");
  await fillText(page, "Q04", "Hong Kong");
  await chooseRadio(page, "Q05", "粵語");
  await chooseRadio(page, "Q06", "美容");
  await chooseRadio(page, "Q07", "1–3 年");
  await chooseRadio(page, "Q08", "6–15 人");
  await chooseRadio(page, "Q09", "兩個");
  await chooseRadio(page, "Q10", "我本人");
  await chooseRadio(page, "Q11", "增長，但愈來愈依賴我");
  await chooseRadio(page, "Q12", "不方便透露");
  await openQuestion(page, "Q13");
  await page.locator('[data-question="Q13"]').getByLabel("創辦人救火", { exact: true }).check();
  await fillText(page, "Q14", "a");
  await fillText(page, "Q15", "b");
  await chooseRadio(page, "Q16", "11–20 小時");
  await fillText(page, "Q17", "c");
  await fillText(page, "Q18", "d");
  await fillText(page, "Q19", "e");
  await chooseRadio(page, "Q20", "我可以決定");
  await chooseRadio(page, "Q21", "我本人");
  await chooseRadio(page, "Q22", "6–10 小時");
  await openQuestion(page, "Q23");
  await page.locator('[data-question="Q23"]').getByRole("button", { name: "8", exact: true }).click();

  // Q27 is conditional on Q24 and lands on a later page once it applies.
  await chooseRadio(page, "Q24", "合作構想");
  await chooseRadio(page, "Q25", "先付費診斷後決定");
  await nextPage(page);
  await expect(page.locator('[data-question="Q27"]')).toBeVisible();
  await prevPage(page);
  await chooseRadio(page, "Q24", "單次聚焦診斷");
  await nextPage(page);
  await expect(page.locator('[data-question="Q27"]')).toHaveCount(0);

  await chooseRadio(page, "Q26", "診斷及排序");
  await fillText(page, "Q28", `test-ht-${Date.now()}@example.com`);
  await fillText(page, "Q29", "+852 9876 5432");
  await fillText(page, "Q30", "instagram.com/test");
  await chooseRadio(page, "Q31", "朋友或客戶轉介");
  await checkConsent(page, "Q32", "application");
  await checkConsent(page, "Q33", "outcome_ack");
  await submitForm(page, "提交申請");

  await expect(page).toHaveURL(/\/f\/high_ticket\/success\//);
  await expect(page.getByText("團隊會先閱讀你的資料，再提供合適的下一步。")).toBeVisible();
  await expect(page.getByRole("link")).toHaveCount(0);
});
