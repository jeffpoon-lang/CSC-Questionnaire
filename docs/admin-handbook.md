# Admin 使用手冊（Carey／Jojo）

登入：`<APP_ORIGIN>/admin/login`。帳戶由 owner 以 `pnpm seed:admin` 建立；連續 5 次密碼錯誤鎖 15 分鐘。

## 每日工作

1. **總覽**：各表單按狀態的數量（不含 TEST）。
2. **提交**：篩選表單／狀態／owner／來源／日期／標籤／關鍵字。標籤格式 `題目ID:value`，例如 `C04:leads_sales`、`G17:advisory`、`Q24:collaboration`。勾「包括 TEST」才會顯示測試資料。
3. **提交詳情**：所有答案按提交當時的題目版本顯示（包括邀請模組）。右欄可改 **狀態** 與 **Review owner**；改狀態會同步到 Notion（如已有 page）。「重試同步」會即時再試 Notion。
4. **匯出 CSV**：按目前篩選匯出；選定單一表單時會包含每題一欄（含長答）。CSV 以 UTF-8 BOM 輸出，Excel 可直接開啟。

### High-ticket 人手分流（計劃書 §7.2）

系統只作標籤，不會自動報價、開日曆或承諾任何服務。請人手閱讀 Q14、Q15、Q18、Q19 原文，並檢查 Q20（決策權）、Q21（執行責任）、Q22（可投入時間）、Q23（準備度），再按計劃書表格決定下一步（免費內容／CSC／60 分鐘診斷／120 分鐘深度診斷／合作審核／澄清服務邊界）。Q24=合作構想 請走獨立合作審核；Q26=代執行或保證成果 請先澄清邊界。

## 表單與版本

- **表單** 頁可啟用／停用每份表單，或把 High-ticket 改為「只限邀請」。
- 修改題目：進入表單 → 「由目前版本建立草稿」→ 在 JSON 編輯器修改 → 「儲存草稿並驗證」→ 「預覽草稿」→ 「發布為新版本」。
- 規則：題目 ID 一經發布 **不可改類型或重用**；可以改文字、加減選項、加新題（用新 ID）。舊提交永遠以舊版本顯示。
- consent：`application` 必填、`marketing` 必須預設不勾選；系統會拒絕違規定義。
- 成功頁 CTA 的連結請用 `{ "setting": "whatsapp_invite_url" }` 這類設定鍵，不要把連結寫死。

## Tailored Module 與邀請連結（High-ticket）

1. **模組**：建立 → 編輯 JSON（題目 ID 以 `M_<slug>_` 開頭）→ 發布。切勿在題目文字放入客戶姓名、公司或個案資料。
2. **邀請連結**：選標籤（內部用）、附加模組、到期日、使用次數上限、預填全名／電郵 → 建立 → 複製連結傳給該位申請人。
3. 公開 URL `/f/high_ticket` 永遠只有 Q01–Q34；模組只在邀請連結出現。提交會記錄 `entry_mode=invite` 與模組版本。
4. 撤銷連結後立即失效；達使用上限或到期會顯示「連結已失效」。

## 設定

| 鍵 | 用途 |
|---|---|
| whatsapp_invite_url | Community／Generic 成功頁主要 CTA；未設定時不顯示按鈕 |
| csc_info_url | 選「CSC 課程資訊」時的次要 CTA |
| privacy_url | 最終私隱聲明；未設定時 `/privacy` 顯示待補頁 |
| notification_recipients | 新提交 Email 收件人（每行一個） |
| notion_db_* | 三個 Notion Database ID |
| duplicate_window_days | 重覆提交判定天數（預設 30） |
| turnstile_enabled / turnstile_site_key | Cloudflare Turnstile 人機驗證（secret 以 wrangler 設定） |
| admin_base_url | Email 內 Admin 連結的網址 |

## Email 通知

每次提交寄一封摘要：稱呼、表單、時間、來源、主要標籤、Admin 連結。**不含任何長答**。`RESEND_API_KEY` 未設定或無收件人時記錄為 skipped。

## 私隱與資料最小化

- 所有長答均提醒不要輸入第三方個人資料。
- Community 表單不收集營業額、預算或團隊細節。
- 測試資料以 `TEST` 標記；production 只接受真實提交（`?test=1` 仍可標記為測試）。
- 匯出的 CSV 含個人資料，請存放在 Carey 指定的受控位置。
