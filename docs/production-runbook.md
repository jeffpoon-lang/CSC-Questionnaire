# Production Runbook

上線當日照住行。設計目標是：**同 Carey 開一次 session 就做得完**，不需要臨場查資料。

> **擁有權**
>
> **營運資產** —— Cloudflare 帳戶、D1、網域／DNS／SSL、Resend 寄件網域、Notion workspace ——
> 全部由 **Carey 或 Carey 指定的帳戶持有 owner 權限**；Jeff 只取最小所需的 collaborator 權限。
> 不要為了「先行起來」而用 Jeff 的帳戶開這些資源：之後全部要拆一次，而且中間任何一刻 Carey 都不是真正的擁有者。
>
> **原始碼** —— 引擎原始碼按雙方口頭共識及 2026 年 6 月簽署的雙向保密協議處理，Carey 獲永久使用權；Carey 專屬的題目、內容、資料及 Notion mapping 全部屬 Carey，隨時可完整匯出。
> （此項依雙方口頭共識，與計劃書 v2.0 §9 的字面寫法不同，以口頭共識為準。）

---

## 開始之前（可以提早準備，不用等當日）

Carey／Jojo 需要準備好這五樣，缺一樣就上不了：

| # | 需要的東西 | 用在哪裡 |
|---|---|---|
| 1 | 最終私隱聲明全文，或一條可公開連結 | 三份問卷底部與 `/privacy` |
| 2 | WhatsApp Community 邀請連結 | Community 問卷成功頁的主要按鈕 |
| 3 | CSC 課程資訊頁網址 | G17／C06 選課程資訊時的次要按鈕 |
| 4 | 新提交通知的收件人電郵（可多於一個） | 每次新提交的摘要 email |
| 5 | 正式網域（例如 `forms.<carey-domain>`）及其 DNS 管理權 | 問卷與 Admin 的公開網址 |

另外需要一位人員在場，能夠在 Carey 的帳戶登入：Cloudflare、Resend、Notion。

---

## 一、Cloudflare（Carey 帳戶）

1. 建立或登入 Carey 的 Cloudflare 帳戶。建議 **Workers Paid** —— D1 免費層有每日讀寫上限，超出會直接回錯誤。
2. **Storage & Databases → D1 → Create** ，名稱 `csc-questionnaire-production`。記下 database ID。
3. **Workers & Pages → Create → Import a repository** ，選 CSC 問卷的 repository：

   | 欄位 | 值 |
   |---|---|
   | Worker name | `csc-questionnaire`（必須與 `wrangler.jsonc` 的 `env.production.name` 相同） |
   | Git branch | `main` |
   | Build command | `pnpm build:cf` |
   | Deploy command | `npx wrangler deploy --env production` |

4. 網域：**Workers → 該 Worker → Settings → Domains & Routes → Add custom domain**，填正式網域。
   DNS 與 SSL 由 Cloudflare 自動處理，通常幾分鐘內生效（最壞 24 小時）。

## 二、Resend（Carey 帳戶）

1. 建立或登入 Carey 的 Resend 帳戶。
2. **Domains → Add Domain**，加入寄件網域，按指示在 DNS 加 SPF／DKIM 記錄，等驗證通過。
3. **API Keys → Create**，權限 **Sending access**，複製 `re_...`。

> ⚠️ **一定要用已驗證的網域。** 用共用測試寄件地址時，Resend 只准寄回帳戶持有人自己的電郵，
> 團隊其他收件人一封都收不到 —— 這點在 staging 實測確認過，官方文件沒有寫明。

## 三、Notion（Carey 帳戶）

1. 在 Carey 的 workspace 建立一版母頁（例如「CSC 問卷」）。
2. 在該母頁下建立三個 database，property 名稱與類型**必須完全依照** `docs/notion-mapping.md`。
3. **notion.so/profile/integrations → New internal integration**，capabilities 勾選
   Read content、Insert content、Update content，複製 `ntn_...`。
4. **逐個 database** 開啟 → 右上 `⋯` → **Connections** → 加入該 integration。
   （母頁授權未必會傳落子 database —— staging 就撞過，逐個加最穩妥。）
5. 記下三個 database ID。

## 四、GitHub

Repository 留在 Jeff 帳戶 —— 引擎原始碼按雙方口頭共識及 2026 年 6 月簽署的雙向保密協議處理，Carey 獲永久使用權；Carey 專屬的題目、內容、資料及 Notion mapping 全部屬 Carey，隨時可完整匯出。

需要做的只有一件事：在 repository 的 **Settings → GitHub Apps**，授權 Carey 帳戶的 Cloudflare
Workers & Pages app 存取此 repository，否則 Carey 的 Cloudflare 匯入不到、Workers Builds 建不了。

---

## 五、填設定並部署

1. 在 `wrangler.jsonc` 的 `env.production` 填入真實值，取代這些佔位符：
   - `d1_databases[0].database_id` → 第一步記下的 D1 ID
   - `vars.APP_ORIGIN` → 正式網址（未有網域前先填 workers.dev 的網址）

   custom domain **不要**寫進設定檔：在 Worker 的 Settings → Domains & Routes 加即可，
   不需要改 code 也不需要重新部署。設定檔裡寫一個帳戶還未擁有的網域，只會令每次部署失敗。

2. **Settings → Variables and Secrets → Add**，Type 選 **Secret**（不是 Text，也不是
   Settings → Build 的 build variables —— 那些 runtime 讀不到）：

   | Name | 值 |
   |---|---|
   | `RESEND_API_KEY` | `re_...` |
   | `RESEND_FROM` | 例如 `CSC Forms <forms@carey-domain>` |
   | `NOTION_TOKEN` | `ntn_...` |

   加完按 **Deploy** 才生效。

3. 初始化資料庫（需要 wrangler 已登入 Carey 帳戶）：

   ```bash
   pnpm db:migrate:prod
   pnpm seed:prod          # 三份問卷與預設設定，idempotent
   ```

4. 建立 owner 帳戶：依 `docs/deploy.md`〈建立 Admin 帳戶（不需 CLI）〉。
   **密碼由 Carey 自己選**，Jeff 不應知道。系統沒有改密碼介面，換密碼就重跑同一段 SQL。

5. 登入 Admin → **設定**，填入開始之前那五樣裡的 1–4，以及三個 Notion database ID
   與 `admin_base_url`（正式網址）。

---

## 六、上線前檢查

登入 Admin → **上線檢查**（`/admin/preflight`）。

- 只有 **BLOCKER** 會擋住上線；WARNING 由操作者判斷。
- 此頁不會顯示任何 secret 的內容，只顯示有沒有設定。
- 目標：`可以上線（production）`，0 項 blocker。

## 七、用 TEST 資料實測，然後清走

1. 每份問卷各提交一次，勾選同意，並在答案中明確標示 `TEST`。
2. 逐項確認：
   - 提交成功、成功頁的 CTA 正確
   - 收到摘要 email，且**不含任何長答內容**
   - Notion 建立了 page，欄位正確
   - Admin 見到該筆，CSV 匯出正常（記得預設不含 TEST，要 `?test=1`）
3. 清除：

   ```bash
   pnpm purge:test -- --env production            # 先 dry run，看清楚會刪什麼
   pnpm purge:test -- --env production --confirm
   ```

   腳本**不會**刪 Notion page —— dry run 會告訴你有幾多版，請自行在 Notion 刪除或封存。

4. 再開一次 `/admin/preflight`，確認「TEST 資料已清除」變成通過。

## 八、Owner 權限交接（Gate 4 #9）

移除或降低 Jeff 的權限後，由 Carey 一方獨立完成以下每一項：

- [ ] 登入 Cloudflare，看得到 Worker 與 D1
- [ ] 登入 Admin，看得到提交、改得到狀態
- [ ] 匯出 CSV
- [ ] 在 Notion 見到同步過來的紀錄
- [ ] 收得到新提交的摘要 email
- [ ] 在 Cloudflare 匯出一次 D1 備份
- [ ] 從 Admin 匯出一次完整 CSV，確認 Carey 專屬的題目、內容與資料可以隨時完整取回

全部通過即完成交接。結果記入 `docs/uat-tracker.md`。

---

## 出事時

| 症狀 | 先看哪裡 |
|---|---|
| 提交成功但沒有 email | Admin 詳情頁的 email 狀態；`email_log.error_text`。最常見是寄件網域未驗證 |
| Notion 沒有紀錄 | Admin →「Notion」的 log；`Could not find data_source` 代表 database 未分享給 integration |
| 問卷頁 500 | Worker 的 Logs（`observability` 已開啟）。D1 binding 錯會直接說出 database id |
| 提交回 409 `version_stale` | 有人剛發布了新版本；重新載入問卷頁即可 |
| 忘記 Admin 密碼／被鎖 | 重跑 `docs/deploy.md` 的 INSERT，`ON CONFLICT` 會覆蓋雜湊並解鎖 |

備份：Cloudflare D1 支援 **Time Travel**（依方案保留一段時間內的任何時間點），
另可用 `wrangler d1 export DB --env production --output backup.sql` 匯出。
交接時應由 Carey 一方至少執行過一次匯出。
