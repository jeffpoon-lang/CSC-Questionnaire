import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "test-admin@example.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("電郵").fill(ADMIN_EMAIL);
  await page.getByLabel("密碼").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
}

/** Primary button on every step before the review step. */
const NAV_NEXT = /^(開始填寫|下一步|檢視答案|返回檢視)$/;

/** Step transitions are animated; give the next page time to mount. */
const STEP_MS = 250;

export async function nextPage(page: Page) {
  await page.getByRole("button", { name: NAV_NEXT }).click();
  await page.waitForTimeout(STEP_MS);
}

export async function prevPage(page: Page) {
  await page.getByRole("button", { name: "上一步", exact: true }).click();
  await page.waitForTimeout(STEP_MS);
}

/**
 * The form renders a few questions per page, so a question is only in the DOM
 * once its page is open. Walk forward until it is (each step validates, so the
 * questions before it must already be answered).
 */
export async function openQuestion(page: Page, questionId: string) {
  const q = page.locator(`[data-question="${questionId}"]`);
  for (let i = 0; i < 40; i++) {
    if ((await q.count()) > 0) return;
    const next = page.getByRole("button", { name: NAV_NEXT });
    if ((await next.count()) === 0) break;
    await next.click();
    await page.waitForTimeout(STEP_MS);
  }
  await expect(q, `could not reach ${questionId}`).toBeVisible();
}

/** Walk to the review step and submit. */
export async function submitForm(page: Page, submitLabel: string) {
  const submit = page.getByRole("button", { name: submitLabel, exact: true });
  for (let i = 0; i < 40 && (await submit.count()) === 0; i++) {
    await page.getByRole("button", { name: NAV_NEXT }).click();
    await page.waitForTimeout(STEP_MS);
  }
  await submit.click();
}

export async function chooseRadio(page: Page, questionId: string, label: string) {
  await openQuestion(page, questionId);
  await page.locator(`[data-question="${questionId}"]`).getByLabel(label, { exact: true }).check();
}

export async function fillText(page: Page, questionId: string, value: string) {
  await openQuestion(page, questionId);
  await page.locator(`[data-question="${questionId}"] input, [data-question="${questionId}"] textarea`).first().fill(value);
}

export async function checkConsent(page: Page, questionId: string, key: string) {
  await openQuestion(page, questionId);
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

/**
 * Put one TEST submission in the database over the API.
 *
 * Specs that read the admin list used to rely on rows another spec had left
 * behind, which made them order-dependent and made the whole suite fail
 * against a freshly purged database. Each spec now creates what it needs.
 */
export async function seedCommunitySubmission(request: APIRequestContext, name = "E2E 種子"): Promise<void> {
  // Read the live version id rather than assuming the seeded one: the
  // versioning spec publishes new versions, and submitting against a stale
  // version is rejected with 409 by design.
  const page = await request.get("/f/community");
  expect(page.ok()).toBeTruthy();
  const formVersionId = /formVersionId\\?":\\?"([A-Za-z0-9_]+)/.exec(await page.text())?.[1];
  expect(formVersionId, "could not read the current community formVersionId").toBeTruthy();

  const res = await request.post("/api/f/community/submit", {
    data: {
      answers: {
        C01: name,
        C02: "beauty",
        C03: "bottleneck",
        C04: "leads_sales",
        C05: "E2E：穩定查詢",
        C06: "csc_info",
        C07: { application: true, marketing: false },
      },
      meta: { formVersionId, test: true, tracking: { source: "e2e" } },
      hp: "",
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}
