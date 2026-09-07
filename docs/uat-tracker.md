# UAT Tracker

## Core Platform Staging Gate（計劃書 Gate 3）

| # | 項目 | 本機 workerd（`pnpm preview` + Playwright／curl） | Staging（Jeff 帳戶） | 備註 |
|---|---|---|---|---|
| 1 | Admin 登入／登出；錯誤密碼拒絕；5 次鎖定 | ✅ `tests/e2e/admin.spec.ts` | ✅ 全部通過 | 見下方〈Staging 驗證紀錄〉 |
| 2 | 三份表單提交 → lead + submission + tags 原子寫入 | ✅ community／generic／high-ticket e2e + D1 查證 | ✅ 三份各提交 1 份 TEST，D1 見 5 submissions／4 leads／70 tags；honeypot 提交回假 200 且**無**寫入 | `db.batch` |
| 3 | Email 摘要（無長答） | ✅ 模板 unit 檢查（`tests/unit/engine/email-summary.test.ts`） | ✅ 已寄出並核對內容 | 見〈Gate 3 #3 驗證紀錄〉 |
| 4 | Notion 同步 + page id | ✅ 無 token → `skipped`，log 正確 | ⚠️ `notion_sync_status=skipped`（`NOTION_TOKEN not set`），符合預期 | 待設 NOTION_TOKEN + database 後重驗 |
| 5 | 草稿續填（reload 還原；成功後清除） | ✅ community e2e | ⬜ 需瀏覽器操作 | localStorage，只可由真人覆核 |
| 6 | CSV 匯出 | ✅ admin e2e（download） | ✅ 全部通過 | 預設排除 TEST 資料，須 `?test=1` 才匯出 |
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

## 已知問題

- ~~**PR branch 的 Workers Build 會失敗**~~ —— 已修正。實際錯誤是 `D1 binding 'DB' references database '00000000-0000-0000-0000-000000000000' which was not found [code: 10181]`：Workers Builds 的 non-production branch 預設部署指令 `npx wrangler versions upload` 不帶 `--env`，因此讀 `wrangler.jsonc` 的 top-level 設定，而該處的 D1 id 是佔位值。修正方式是把 top-level 改成真正可部署的 staging 設定（詳見 `docs/deploy.md`），不需要改 dashboard。

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

## Staging 驗證紀錄（第二輪，2026-09-07）

Admin 帳戶已建立（`admin_owner`，`last_login_at` 有值 —— 真人登入成功）。Gate 3 #1 同 #6 用一個臨時
`admin_gate_test` 帳戶完成驗證，驗完即時連同其 session 一併刪除；過程中沒有觸碰 owner 帳戶
（驗證後 `admin_owner` 仍然 `failed_attempts=0`、未鎖定、session 完好）。

> 本容器的 Chromium 無法經 egress proxy 完成 TLS（任何網站都 `ERR_CONNECTION_RESET`），
> 因此改以 `curl` 驅動 Next.js server action 的無 JS 表單路徑完成驗證。
> `tests/e2e/staging-gate.spec.ts` 保留同一組檢查的 Playwright 版本，供有正常瀏覽器出口的環境使用。

| 檢查 | 結果 |
|---|---|
| 正確密碼登入 | ✅ 303 → `/admin`；cookie `csc_admin` 帶 `Secure`、`HttpOnly`、`SameSite=lax`、14 日到期 |
| 登入後 `/admin`、`/admin/submissions` | ✅ 200，顯示總覽 |
| CSV 匯出（預設） | ✅ 200，`text/csv; charset=utf-8`，檔名 `csc-submissions-all-<日期>.csv`，帶 UTF-8 BOM；**只有標頭列** |
| CSV 匯出 `?test=1` | ✅ 6 筆 TEST 提交全部匯出，欄位齊全 |
| CSV 匯出 `?test=1&form=generic_csc` | ✅ 49 欄，末端為 G01–G20 題目文字欄（含長答 G10） |
| 登出 | ✅ 303 → `/admin/login`；cookie 以 1970 到期日清除；**`sessions` 資料列亦已刪除**（非只清 cookie） |
| 登出後 `/admin` | ✅ 307 → `/admin/login?next=%2Fadmin` |
| 登出後 `/api/admin/export` | ✅ 401 |
| 錯誤密碼 ×4 | ✅ 每次顯示「電郵或密碼不正確」，不透露帳戶是否存在 |
| 第 5 次錯誤 | ✅ 顯示「嘗試次數過多，帳戶已暫時鎖定 15 分鐘」 |
| 鎖定期間用正確密碼 | ✅ 仍被拒，顯示 15 分鐘訊息 |
| D1 狀態 | ✅ TEST 帳戶 `failed_attempts=5`、`locked_until` 有值；owner 帳戶不受影響 |

**CSV 預設排除 TEST 資料是刻意設計**（`includeTest` 預設 false），符合計劃書「測試資料不可流入營運輸出」的要求。

Gate 3 現況：#1、#2、#6、#7 已在 staging 通過；#5 待真人用瀏覽器覆核；#3、#4、#8 待 Resend／Notion。

⚠️ staging D1 現有 **6** 筆 `is_test=1` 資料（原 5 筆，加 Jeff 自行測試提交的一筆），上 production 前須清除或隔離。

## Gate 3 #3 驗證紀錄（Email 摘要，2026-09-07）

Resend API key 已設為 Worker secret，`notification_recipients` 已填。提交一份 TEST（`generic_csc`，
五條長答全部植入可辨識字串）後：

| 檢查 | 結果 |
|---|---|
| `email_log.status` | ✅ `sent`，有 Resend provider id |
| Subject | ✅ `[TEST] [CSC] 新提交｜了解你的創業現況｜…` —— TEST 提交有前綴 |
| 長答（G10／G11／G12／G13／G16） | ✅ text 同 html 都完全冇出現 |
| 主要標籤 | ✅ 九條 `tag:true` 題目，全部顯示中文選項標籤 |
| Admin 連結 | ✅ 用 `settings.admin_base_url` 組成 |
| 提交本身 | ✅ 不受 email 結果影響（先回 200，email 在背景送） |

**Resend 未驗證網域時的限制（實測確認）**：用測試寄件人 `onboarding@resend.dev` 時，
只可以寄去 Resend 帳戶本身的電郵地址；寄去其他收件人會回
`You can only send testing emails to your own email address (…)`，
`email_log` 記為 `failed` 並帶完整原因，提交不受影響。官方文件沒有寫明這一點。
**Production 必須用 Carey 已驗證的寄件網域**，否則通知只寄得到帳戶持有人自己。

驗證期間 `notification_recipients` 暫時改成 Resend 帳戶電郵；正式收件人名單由 Carey／Jojo 決定後在
Admin 設定頁填回。

**同時修正**：email 模板的 `labelFor` 沒有處理 `optionsFrom`，令 G09 印出原始值 `team_delegation`
而非「招聘、培訓、留人或授權」。Notion mapper 與 Admin 詳情頁本來已正確處理，只有 email 漏了。
已修正並補上會重現該 bug 的單元測試。
