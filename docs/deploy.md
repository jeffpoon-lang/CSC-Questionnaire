# 部署與環境

## 架構

Next.js 16（App Router）→ `@opennextjs/cloudflare` → Cloudflare Workers；資料庫 Cloudflare D1（Drizzle ORM）；Email Resend；Notion 單向同步。
`wrangler.jsonc` 的 **top-level（預設）環境就是 staging**，另有具名的 `staging` 與 `production`。**env 不會繼承 binding**，每個 env 都要寫齊 `d1_databases` 與 `assets`。

> top-level 必須是一個可實際部署的設定：任何不帶 `--env` 的 wrangler 指令都會落到這裡，而 Workers Builds 的 non-production branch 預設部署指令正是 `npx wrangler versions upload`（無 `--env`）。以前這裡放的是佔位 D1 id，令每個 PR build 都以 `D1 binding 'DB' references database '00000000-…' which was not found [code: 10181]` 失敗。
>
> **代價**：不帶 `--env` 的 `--remote` 指令現在會打到 staging。做遠端 D1 操作時一律要加 `--env`。本機開發（`pnpm dev`、`pnpm preview`、`pnpm db:migrate:local`、`pnpm seed:local`）行的是 Miniflare 本機儲存，不會碰到遠端資料庫。

## 帳戶與擁有權（計劃書 §9）

| 資產 | Owner |
|---|---|
| Git repository | Carey 或 Carey 指定帳戶（Jeff collaborator） |
| Cloudflare 帳戶（Workers、D1、domain／DNS／SSL） | Carey；staging 暫時在 Jeff 帳戶 |
| Resend（sender domain） | Carey |
| Notion integration | Carey |

Production 必須在 Carey 的 Cloudflare 帳戶建立；本 repo 的 `env.production` 只留 placeholder。

> D1 免費層自 2026-09-01 起超出每日 row read／write 上限會直接回錯誤。建議 production 使用 Workers Paid。

## 首次部署（staging）

> **現況（2026-09-06）**：staging 已用路線 A 部署，網址 `https://csc-questionnaire-staging.jeff-poon.workers.dev`，D1 `csc-questionnaire-staging` 已 migrate 與 seed。驗證結果見 `docs/uat-tracker.md`。

D1 `csc-questionnaire-staging` 已建立、已套用 migration 並已 seed 三份表單與預設 settings，id 已寫入 `wrangler.jsonc`。以下兩條路線二選一。

### 路線 A：Cloudflare Dashboard（Workers Builds，免安裝任何工具）

1. Dashboard → **Workers & Pages** → **Create application** → **Import a repository** → 選 `jeffpoon-lang/CSC-Questionnaire`。
2. 設定：

   | 欄位 | 值 |
   |---|---|
   | Worker name | `csc-questionnaire-staging`（**必須**與 `wrangler.jsonc` 的 `env.staging.name` 相同，否則 build 失敗） |
   | Git branch | `main` |
   | Build command | `pnpm build:cf` |
   | Deploy command | `npx wrangler deploy --env staging` |

3. **Settings → Build → Branch control**：`Production branch` 設為 `main`。**Builds for non-production branches** 勾唔勾都可以 —— top-level 設定本身就是可部署的 staging，所以預設的 `npx wrangler versions upload` 亦行得通，會為每個 PR 產生 preview 版本而不影響 live deployment。

4. **Settings → Variables and Secrets → Add**，Type 選 **Secret**：`RESEND_API_KEY`、`RESEND_FROM`、`NOTION_TOKEN`。未設定時 Email／Notion 會記錄為 `skipped`，不影響提交。（這些是 runtime secrets，與 Settings → Build 的 build variables 是兩回事。）
5. 建立 Admin 帳戶：在瀏覽器 Console 產生密碼雜湊（密碼不會離開你的電腦），再於 **D1 → csc-questionnaire-staging → Console** 貼上 INSERT。見下方〈建立 Admin 帳戶〉。

`APP_ORIGIN` 不必事先填：應用程式會以實際請求的 host 判斷 origin 與 cookie `Secure`，設定值只作為沒有請求上下文時的後備。staging 的 `APP_ORIGIN` 已填成 `https://csc-questionnaire-staging.jeff-poon.workers.dev`；production 換上正式網域後同樣要更新 `env.production.vars.APP_ORIGIN`。

### 路線 B：本機 CLI

```bash
pnpm install
pnpm exec wrangler login
pnpm db:migrate:staging                 # 已套用時會顯示 no migrations to apply
pnpm seed:staging                       # idempotent
ADMIN_SEED_EMAIL=carey@example.com ADMIN_SEED_NAME="Carey" PASSWORD='<至少12字元>' pnpm seed:admin -- --env staging --remote
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_FROM --env staging     # 例如 "CSC Forms <forms@yourdomain>"
pnpm exec wrangler secret put NOTION_TOKEN --env staging
pnpm deploy:staging
```

## 建立 Admin 帳戶（不需 CLI）

在瀏覽器 Console 執行，把密碼換成你自己的（至少 12 字元）：

```js
(async (pw) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, k, 256);
  const b64 = (u) => btoa(String.fromCharCode(...u));
  console.log(`pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`);
})("換成你的密碼");
```

把輸出的 `pbkdf2$...` 貼入以下 SQL，於 D1 Console 執行：

```sql
INSERT INTO admin_users (id, email, password_hash, display_name, role, failed_attempts, locked_until, created_at, last_login_at)
VALUES ('admin_owner', 'owner@example.com', '貼上 pbkdf2$...', 'Owner', 'owner', 0, NULL, unixepoch()*1000, NULL)
ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, failed_attempts = 0, locked_until = NULL;
```

系統目前沒有「更改密碼」介面；要換密碼就重新執行同一段 SQL（`ON CONFLICT` 會覆蓋雜湊）。

## Production（Carey 帳戶）

1. 在 Carey 帳戶 `wrangler d1 create csc-questionnaire-production`，把 id 填入 `env.production.d1_databases`。
2. 設定 custom domain（`env.production.routes`）與 `APP_ORIGIN`。Workers Builds 亦可用同樣方式連接，Worker 名須為 `csc-questionnaire`、deploy command 為 `npx wrangler deploy --env production`。
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
