# UAT Tracker

## Core Platform Staging Gate（計劃書 Gate 3）

| # | 項目 | 本機 workerd（`pnpm preview` + Playwright／curl） | Staging（Jeff 帳戶） | 備註 |
|---|---|---|---|---|
| 1 | Admin 登入／登出；錯誤密碼拒絕；5 次鎖定 | ✅ `tests/e2e/admin.spec.ts` | ⬜ 待 deploy 後覆核 | 鎖定邏輯 unit-level 驗證於 session.ts |
| 2 | 三份表單提交 → lead + submission + tags 原子寫入 | ✅ community／generic／high-ticket e2e + D1 查證 | ⬜ | `db.batch` |
| 3 | Email 摘要（無長答） | ✅ 無 API key → `email_log.status=skipped`；模板 unit 檢查 | ⬜ 需 RESEND_API_KEY | 模板明確排除 sensitive 題 |
| 4 | Notion 同步 + page id | ✅ 無 token → `skipped`，log 正確 | ⬜ 需 NOTION_TOKEN + database | |
| 5 | 草稿續填（reload 還原；成功後清除） | ✅ community e2e | ⬜ | localStorage |
| 6 | CSV 匯出 | ✅ admin e2e（download） | ⬜ | |
| 7 | form_version／utm／landing_page／cta／consent／entry_mode／is_test | ✅ D1 查證 + invite e2e | ⬜ | |
| 8 | Notion 失敗不影響提交；修正後 Admin 重試成功 | ✅ 提交成功、狀態 skipped、重試按鈕可用 | ⬜ 用錯誤 database id 實測 | |

## UAT 九項（計劃書 Gate 4）

| # | 測試 | 狀態 | 重現步驟 | 證據 |
|---|---|---|---|---|
| 1 | Community 7 題完整流程 | ✅ 本機 | `tests/e2e/community.spec.ts` | Playwright 通過 |
| 2 | Generic 20 題（G08→G09 動態、上限 3／2、G17 分流） | ✅ 本機 | `tests/e2e/generic.spec.ts` | |
| 3 | High-ticket Core 34 題（Q24→Q27 條件、只顯示訊息） | ✅ 本機 | `tests/e2e/high-ticket.spec.ts` | |
| 4 | Tailored Module 只在邀請連結出現、版本記錄 | ✅ 本機 | `tests/e2e/versioning-invites.spec.ts` | |
| 5 | Consent：application 必填、marketing 預設否 | ✅ unit + e2e | `tests/unit/engine/zod.test.ts` | |
| 6 | 重覆提交標記 duplicate_of | ⬜ staging | 同一電郵 30 日內提交同一表單兩次 → Admin 顯示「重覆」 | |
| 7 | Notion 失敗重試 | ⬜ staging | 設錯 database id → 提交 → failed → 改正 → 重試 → synced | |
| 8 | Admin 改題目並發布；舊提交仍以舊版本顯示 | ✅ 本機 | versioning e2e | |
| 9 | Owner 權限：移除 collaborator 後仍可管理／匯出／備份 | ⬜ 交接 | docs/deploy.md 檢查清單 | |

## 已知限制

- Admin 題目編輯器為 JSON 形式（有驗證、預覽、規則檢查）；視覺化編輯器留待下一階段。
- Turnstile 需在設定開啟並提供 site key／secret；預設關閉。
- Notion property 名稱必須先在 database 建立（見 docs/notion-mapping.md）。
- 本 session 的 container 未能用 wrangler 驗證 Cloudflare token，因此 Worker deploy 由 Jeff 本機執行；staging D1 已建立並套用 migration／seed。
