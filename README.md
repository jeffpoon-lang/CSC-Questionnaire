# CSC Questionnaire Platform

Carey Cheung／Acaredemy《眉煩惱得億的黃金三角創業系統》Sales Funnel 的問卷平台：三個入口（Community 7 題、Generic CSC 20 題、High-ticket 34 題 + invite-only Tailored Module）共用一個 schema-driven 引擎、D1 主資料庫、Admin、Email 摘要與 Notion 單向同步。

- 技術：Next.js 16 · @opennextjs/cloudflare · Cloudflare Workers + D1 · Drizzle · zod · Resend · Notion API
- 部署：Cloudflare Dashboard 的 Workers Builds（Git 整合，免 CLI）或本機 `pnpm deploy:staging`；兩者步驟見 [部署與環境](docs/deploy.md)
- 文件：[部署與環境](docs/deploy.md) · [Production Runbook](docs/production-runbook.md) · [Admin 手冊](docs/admin-handbook.md) · [Data Dictionary](docs/data-dictionary.md) · [Notion Mapping](docs/notion-mapping.md) · [UAT Tracker](docs/uat-tracker.md)
- 上線：交接當日照住 [Production Runbook](docs/production-runbook.md) 行；Admin 的 `/admin/preflight` 會列出仍未通過的項目

## 路徑

| 路徑 | 用途 |
|---|---|
| `/f/community`、`/f/generic_csc`、`/f/high_ticket` | 公開問卷（`?src=instagram&utm_*=...&cta=...` 會被記錄；`?i=<token>` 為邀請連結） |
| `/f/<slug>/success/<token>` | 成功頁，按答案顯示條件式 CTA |
| `/admin` | 後台（登入、提交、表單版本、模組、邀請連結、Notion、設定） |
| `/api/f/<slug>/submit` | 提交 API |
| `/api/admin/export` | CSV 匯出 |

## 開發

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local && pnpm seed:local
ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_NAME=You PASSWORD='ChangeMe12345!' pnpm seed:admin -- --local
pnpm dev                    # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test
pnpm preview                # 真 workerd；另一個 terminal: E2E_BASE_URL=http://localhost:8787 pnpm test:e2e
```

## 結構

```
src/engine/          純邏輯：definition types、條件、動態選項、可見性、zod 驗證、發布規則
src/forms/canonical/ 三份問卷的正式定義（G01–G20、Q01–Q34、C01–C07）；seed 來源
src/db/              Drizzle schema、D1 client、查詢
src/server/          提交 pipeline、auth、email、notion、settings、csv
src/app/f/           公開問卷與成功頁
src/components/form/ 問卷 renderer：逐頁分頁（pagination.ts）、頁間動畫、進度、檢視答案頁
src/app/admin/       後台
scripts/             seed SQL、admin seed、data dictionary 生成
drizzle/             migrations 與 seed SQL
tests/               vitest（engine）、Playwright（端對端）
```

## 不可改動的規則

- 題目 ID 一經發布不可改類型或重用；新版本不覆蓋舊提交。
- 三份問卷保持獨立入口與用途；Community 不收集營業額／預算／團隊細節。
- 任何價格、優惠、退款、名額、邀請連結、Notion ID 都不寫死在程式；由 Carey／Jojo 在 Admin 設定或書面批准。
- 成功頁與自動訊息不作收入、時間或成果保證；High-ticket 成功頁只顯示「團隊會先閱讀你的資料」。
