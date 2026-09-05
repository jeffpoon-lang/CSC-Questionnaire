import { expect, test } from "@playwright/test";
import { adminLogin, checkConsent, chooseRadio, fillText } from "./helpers";

test("form versioning: draft, publish, immutability rule, disable/enable", async ({ page }) => {
  await adminLogin(page);
  // Make sure the form is enabled (a previous failed run may have left it disabled).
  await page.goto("/admin/forms");
  const enableBtn = page.locator("tr", { hasText: "Community" }).getByRole("button", { name: "啟用" });
  if (await enableBtn.isVisible()) {
    await enableBtn.click();
    await expect(page.locator("tr", { hasText: "Community" }).getByRole("button", { name: "停用" })).toBeVisible();
  }
  await page.goto("/admin/forms/community");
  const createDraft = page.getByRole("button", { name: "由目前版本建立草稿" });
  if (await createDraft.isVisible()) await createDraft.click();
  await expect(page.getByText(/編輯草稿 v\d+/)).toBeVisible();

  const editor = page.locator("textarea[name=json]");
  const original = await editor.inputValue();
  const def = JSON.parse(original);

  // Type change on an existing id must be rejected.
  const bad = structuredClone(def);
  bad.questions[0].type = "long_text";
  await editor.fill(JSON.stringify(bad, null, 2));
  await page.getByRole("button", { name: "發布為新版本" }).click();
  await expect(page.getByText(/不可改為 long_text/)).toBeVisible();

  // Label change publishes with a warning.
  const good = structuredClone(def);
  const stamp = Date.now().toString(36);
  good.questions[0].label = `你希望我們怎樣稱呼你？（${stamp}）`;
  await editor.fill(JSON.stringify(good, null, 2));
  await page.getByRole("button", { name: "發布為新版本" }).click();
  await expect(page.getByText(/已發布 v\d+/)).toBeVisible();

  await page.goto("/f/community");
  await expect(page.getByText(`你希望我們怎樣稱呼你？（${stamp}）`)).toBeVisible();

  // disable / enable
  await page.goto("/admin/forms");
  const row = page.locator("tr", { hasText: "Community" });
  await row.getByRole("button", { name: "停用" }).click();
  await expect(page.locator("tr", { hasText: "Community" }).getByRole("button", { name: "啟用" })).toBeVisible();
  await page.goto("/f/community");
  await expect(page).toHaveURL(/\/f\/community\/closed/);
  await page.goto("/admin/forms");
  await page.locator("tr", { hasText: "Community" }).getByRole("button", { name: "啟用" }).click();
  await expect(page.locator("tr", { hasText: "Community" }).getByRole("button", { name: "停用" })).toBeVisible();
  await page.goto("/f/community");
  await expect(page.getByRole("heading", { name: /1 分鐘了解/ })).toBeVisible();
});

test("tailored module + invite link: hidden on public URL, present via invite, recorded on submission", async ({ page }) => {
  await adminLogin(page);
  const slug = `e2e_${Date.now().toString(36)}`;
  await page.goto("/admin/modules");
  await page.getByLabel(/slug/).fill(slug);
  await page.getByLabel("名稱").fill("E2E 模組");
  await page.getByRole("button", { name: "建立草稿" }).click();
  await expect(page).toHaveURL(/\/admin\/modules\/[A-Z0-9]+/);
  const moduleUrl = page.url();

  const editor = page.locator("textarea[name=json]");
  const def = JSON.parse(await editor.inputValue());
  def.questions = [
    { id: `M_${slug}_01`, type: "single_select", label: "E2E 模組題", required: true, tag: true, options: [{ value: "a", label: "選項 A" }, { value: "b", label: "選項 B" }] },
  ];
  await editor.fill(JSON.stringify(def, null, 2));
  await page.getByRole("button", { name: "發布為新版本" }).click();
  await expect(page.getByText(/已發布 v1/)).toBeVisible();
  expect(moduleUrl).toBeTruthy();

  await page.goto("/admin/invites");
  const inviteLabel = `E2E invite ${slug}`;
  await page.getByLabel(/標籤/).fill(inviteLabel);
  await page.getByRole("checkbox", { name: new RegExp(slug) }).check();
  await page.getByLabel(/預填全名/).fill("TEST Invitee");
  await page.getByRole("button", { name: "建立連結" }).click();
  const url = await page.locator("tr", { hasText: inviteLabel }).first().locator("input[readonly]").inputValue();
  expect(url).toMatch(/\/f\/high_ticket\?i=/);

  // public URL: no module question
  await page.goto("/f/high_ticket");
  await expect(page.locator(`[data-question="M_${slug}_01"]`)).toHaveCount(0);

  // invite URL: module present + prefill
  await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page.getByText("專屬邀請版本")).toBeVisible();
  await expect(page.locator(`[data-question="M_${slug}_01"]`)).toBeVisible();
  await expect(page.locator('[data-question="Q01"] input')).toHaveValue("TEST Invitee");

  await fillText(page, "Q02", "TEST Brand");
  await chooseRadio(page, "Q03", "創辦人");
  await fillText(page, "Q04", "HK");
  await chooseRadio(page, "Q05", "粵語");
  await chooseRadio(page, "Q06", "美容");
  await chooseRadio(page, "Q07", "1–3 年");
  await chooseRadio(page, "Q08", "6–15 人");
  await chooseRadio(page, "Q09", "兩個");
  await chooseRadio(page, "Q10", "我本人");
  await chooseRadio(page, "Q11", "團隊或營運混亂");
  await chooseRadio(page, "Q12", "不方便透露");
  await page.locator('[data-question="Q13"]').getByLabel("主管責任", { exact: true }).check();
  for (const [q, t] of [["Q14", "a"], ["Q15", "b"], ["Q17", "c"], ["Q18", "d"], ["Q19", "e"]]) await fillText(page, q, t);
  await chooseRadio(page, "Q16", "21–30 小時");
  await chooseRadio(page, "Q20", "我可以決定");
  await chooseRadio(page, "Q21", "已確定的主管或項目負責人");
  await chooseRadio(page, "Q22", "6–10 小時");
  await page.locator('[data-question="Q23"]').getByRole("button", { name: "9", exact: true }).click();
  await chooseRadio(page, "Q24", "長期私人顧問");
  await chooseRadio(page, "Q25", "USD 13,001–40,000");
  await chooseRadio(page, "Q26", "一段時間的客製回饋與問責");
  await fillText(page, "Q28", `invitee-${Date.now()}@example.com`);
  await fillText(page, "Q29", "+852 6123 4567");
  await chooseRadio(page, "Q31", "現有課程或服務客戶");
  await chooseRadio(page, `M_${slug}_01`, "選項 B");
  await checkConsent(page, "Q32", "application");
  await checkConsent(page, "Q33", "outcome_ack");
  await page.getByRole("button", { name: "提交申請" }).click();
  await expect(page).toHaveURL(/\/f\/high_ticket\/success\//);

  // second use should be blocked (max_uses = 1)
  await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page).toHaveURL(/\/f\/high_ticket\/closed\?reason=invite/);

  // admin shows invite entry + module answer, tag filter works
  await page.goto(`/admin/submissions?test=1&entry=invite&tag=M_${slug}_01:b`);
  const first = page.locator("tbody tr a").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByText("E2E 模組題")).toBeVisible();
  await expect(page.getByText("選項 B")).toBeVisible();
  await expect(page.getByText(`${slug}@v1`)).toBeVisible();
});
