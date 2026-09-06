# UAT Tracker

## Core Platform Staging Gate（計劃書 Gate 3）

| # | 項目 | 本機 workerd（`pnpm preview` + Playwright／curl） | Staging（Jeff 帳戶） | 備註 |
|---|---|---|---|---|
| 1 | Admin 登入／登出；錯誤密碼拒絕；5 次鎖定 | ✅ `tests/e2e/admin.spec.ts` | ⚠️ 部分：`/admin/*` 未登入一律 307 去 `/admin/login?next=…`、`/api/admin/export` 回 401 | 完整登入／鎖定待 Jeff 建立 Admin 帳戶後覆核 |
| 2 | 三份表單提交 → lead + submission + tags 原子寫入 | ✅ community／generic／high-ticket e2e + D1 查證 | ✅ 三份各提交 1 份 TEST，D1 見 5 submissions／4 leads／70 tags；honeypot 提交回假 200 且**無**寫入 | `db.batch` |
| 3 | Email 摘要（無長答） | ✅ 無 API key → `email_log.status=skipped`；模板 unit 檢查 | ⚠️ `email_log.status=skipped`（`RESEND_API_KEY not set`），符合預期 | 待設 RESEND_API_KEY 後重驗 |
| 4 | Notion 同步 + page id | ✅ 無 token → `skipped`，log 正確 | ⚠️ `notion_sync_status=skipped`（`NOTION_TOKEN not set`），符合預期 | 待設 NOTION_TOKEN + database 後重驗 |
| 5 | 草稿續填（reload 還原；成功後清除） | ✅ community e2e | ⬜ 需瀏覽器操作 | localStorage，Jeff 手動覆核 |
| 6 | CSV 匯出 | ✅ admin e2e（download） | ⚠️ 未登入正確回 401 | 待 Admin 帳戶後覆核下載 |
| 7 | form_version／utm／landing_page／cta／consent／entry_mode／is_test | ✅ D1 查證 + invite e2e | ✅ 五筆 row 全部欄位齊；電話已正規化 E.164、電郵已轉小寫 | |
| 8 | Notion 失敗不影響提交；修正後 Admin 重試成功 | ✅ 提交成功、狀態 skipped、重試按鈕可用 | ⚠️ 提交成功、狀態 skipped、log 有原因 | 設好 token 後用錯誤 database id 實測 |

## UAT 九項（計劃書 Gate 4）

| # | 測試 | 狀態 | 重現步驟 | 證據 |
|---|---|---|---|---|
| 1 | Community 7 題完整流程 | ✅ 本機 | `tests/e2e/community.spec.ts` | Playwright 通過 |
| 2 | Generic 20 題（G08→G09 動態、上限 3／2、G17 分流） | ✅ 本機 | `tests/e2e/generic.spec.ts` | |
| 3 | High-ticket Core 34 題（Q24→Q27 條件、只顯示訊息） | ✅ 本機 | `tests/e2e/high-ticket.spec.ts` | |
| 4 | Tailored Module 只在邀請連結出現、版本記錄 | ✅ 本機 | `tests/e2e/versioning-invites.spec.ts` | |
| 5 | Consent：application 必填、marketing 預設否 | ✅ unit + e2e | `tests/unit/engine/zod.test.ts` | |
| 6 | 重覆提交標記 duplicate_of | ✅ staging | 同一電郵 30 日內提交同一表單兩次 → Admin 顯示「重覆」 | 第二筆 `duplicate_of` 有值，兩筆共用同一 `lead_id` |
| 7 | Notion 失敗重試 | ⬜ staging | 設錯 database id → 提交 → failed → 改正 → 重試 → synced | |
| 8 | Admin 改題目並發布；舊提交仍以舊版本顯示 | ✅ 本機 | versioning e2e | |
| 9 | Owner 權限：移除 collaborator 後仍可管理／匯出／備份 | ⬜ 交接 | docs/deploy.md 檢查清單 | |

## 已知限制

- Admin 題目編輯器為 JSON 形式（有驗證、預覽、規則檢查）；視覺化編輯器留待下一階段。
- Turnstile 需在設定開啟並提供 site key／secret；預設關閉。
- Notion property 名稱必須先在 database 建立（見 docs/notion-mapping.md）。
- 本 session 的 container 未能用 wrangler 驗證 Cloudflare token，因此 Worker 由 Jeff 在 Cloudflare dashboard 用 Workers Builds 部署；staging D1 已建立並套用 migration／seed。

## Staging 驗證紀錄

- **日期**：2026-09-06
- **URL**：`https://csc-questionnaire-staging.jeff-poon.workers.dev`（Jeff 個人 Cloudflare 帳戶；production 須依計劃書 §9 於 Carey 帳戶建立）
- **部署方式**：Cloudflare dashboard → Workers Builds（GitHub `main`）；build `pnpm build:cf`、deploy `npx wrangler deploy --env staging`
- **D1**：`csc-questionnaire-staging`（`bd26559c-8f09-42cc-96df-f9f439bc4ddd`）

已在 staging 實測通過：

| 檢查 | 結果 |
|---|---|
| `/`、`/f/community`、`/f/generic_csc`、`/f/high_ticket`、`/admin/login` | 200 |
| 表單題目由 D1 載入（非 build-time 常數） | ✅ 見 `formVersionId: form_community_v1` 等 |
| 問卷頁 `robots` | `noindex, nofollow` |
| 三份表單 TEST 提交 | ✅ 全部 200，`is_test=1` |
| 必填 consent 驗證 | ✅ 缺 Q33 → 422 `{"Q33":"請勾選以繼續"}` |
| 隱藏題剝走 | ✅ Q24≠`collaboration` 時，即使 client 送出 Q27 亦不入庫 |
| 版本過期保護 | ✅ 錯誤 `formVersionId` → 409 `version_stale` |
| Honeypot | ✅ 回假 200，DB 無新 row |
| 重覆提交 | ✅ 第二筆標記 `duplicate_of`，lead 重用 |
| 標籤正規化 | ✅ 只有 `tag:true` 題目入 `submission_tags`（長答一律不入） |
| 未登入存取 Admin | ✅ 頁面 307 去 login；`/api/admin/export` 401 |
| 不存在的表單 | ✅ 404 |

尚待 Jeff／Carey 完成：Admin 帳戶（Gate 3 #1、#6）、草稿續填手動覆核（#5）、Resend（#3）、Notion（#4、#8）。

⚠️ staging D1 內目前有 5 筆 `is_test=1` 的 TEST 資料，上 production 前須清除或隔離（計劃書 §10）。
