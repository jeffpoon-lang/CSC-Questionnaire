# 部署與環境

## 架構

Next.js 16（App Router）→ `@opennextjs/cloudflare` → Cloudflare Workers；資料庫 Cloudflare D1（Drizzle ORM）；Email Resend；Notion 單向同步。
`wrangler.jsonc` 定義三個環境：top-level（local）、`staging`、`production`。**env 不會繼承 binding**，每個 env 都要寫齊 `d1_databases` 與 `assets`。

## 帳戶與擁有權（計劃書 §9）

| 資產 | Owner |
|---|---|
| Git repository | Carey 或 Carey 指定帳戶（Jeff collaborator） |
| Cloudflare 帳戶（Workers、D1、domain／DNS／SSL） | Carey；staging 暫時在 Jeff 帳戶 |
| Resend（sender domain） | Carey |
| Notion integration | Carey |

Production 必須在 Carey 的 Cloudflare 帳戶建立；本 repo 的 `env.production` 只留 placeholder。

> D1 免費層自 2026-09-01 起超出每日 row read／write 上限會直接回錯誤。建議 production 使用 Workers Paid。

## 首次部署（staging，Jeff 帳戶）

```bash
pnpm install
pnpm exec wrangler login                # 以 Jeff 帳戶登入（或設定有效的 CLOUDFLARE_API_TOKEN）
# D1 已建立：csc-questionnaire-staging（id 已寫入 wrangler.jsonc）
pnpm db:migrate:staging                 # 如已由 MCP 套用會顯示 no migrations to apply
pnpm seed:staging                       # idempotent
ADMIN_SEED_EMAIL=carey@example.com ADMIN_SEED_NAME="Carey" PASSWORD='<至少12字元>' pnpm seed:admin -- --env staging --remote
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_FROM --env staging     # 例如 "CSC Forms <forms@yourdomain>"
pnpm exec wrangler secret put NOTION_TOKEN --env staging
pnpm deploy:staging
```

部署後把 `env.staging.vars.APP_ORIGIN` 改為實際 workers.dev 網址（cookie `Secure` 與 CSRF origin check 依賴它），再 deploy 一次。

## Production（Carey 帳戶）

1. 在 Carey 帳戶 `wrangler d1 create csc-questionnaire-production`，把 id 填入 `env.production.d1_databases`。
2. 設定 custom domain（`env.production.routes`）與 `APP_ORIGIN`。
3. `pnpm db:migrate:prod && pnpm seed:sql && wrangler d1 execute DB --env production --remote --file drizzle/seed/0001_forms.sql`。
4. `pnpm seed:admin -- --env production --remote`（owner 帳戶）。
5. 三個 secrets + `pnpm deploy:prod`。
6. 在 Admin → 設定 填入 WhatsApp 連結、收件人、Notion Database、privacy_url、admin_base_url。
7. 確認 staging 的 TEST 資料**不會**流入 production Notion（production 用獨立 database id）。

## 本機開發

```bash
cp .dev.vars.example .dev.vars
pnpm db:migrate:local && pnpm seed:local
ADMIN_SEED_EMAIL=you@example.com PASSWORD='...' pnpm seed:admin -- --local
pnpm dev          # next dev（local D1 via Miniflare）
pnpm preview      # 真 workerd（部署前必跑）
pnpm test         # vitest
E2E_BASE_URL=http://localhost:8787 pnpm test:e2e   # 對 preview 跑 Playwright
```

## 備份／匯出／還原

- 匯出整個 D1：`wrangler d1 export DB --env production --remote --output backup.sql`
- 還原：`wrangler d1 execute DB --env production --remote --file backup.sql`（先在空 database 測試）
- 提交資料 CSV：Admin → 提交 → 匯出 CSV（按篩選）
- Cloudflare D1 亦提供 Time Travel（30 日 point-in-time 還原）。

## 移除 collaborator 後系統照常運作的檢查

Owner 帳戶可：登入 Admin、改題目並發布、啟停表單、匯出 CSV、`wrangler deploy`、`wrangler d1 export`、更換 secrets。以上全部不依賴 Jeff 帳戶。
