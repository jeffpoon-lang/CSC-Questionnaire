# Notion Mapping（D1 → Notion 單向同步）

D1 是唯一完整資料來源；Notion 只是營運跟進 view。同步失敗不會令提交失敗，可在 Admin →「Notion」重試。

## 設定

| 項目 | 位置 |
|---|---|
| Notion integration token | `wrangler secret put NOTION_TOKEN --env staging`（production 同樣）；Integration 由 Carey 帳戶建立並 owner 持有 |
| 每份表單的 Database ID | Admin → 設定 → `notion_db_generic_csc` / `notion_db_high_ticket` / `notion_db_community`。可填 database id，或 `ds:<data_source_id>` |
| Admin 連結 | Admin → 設定 → `admin_base_url`（例如 `https://forms.example.com`） |

Integration 必須被邀請到每個 database（Notion → database 頁 → ⋯ → Connections）。

## 每個 database 需要預先建立的 property

Property 名稱必須完全一致（區分全形／半形），類型如下。Select／Multi-select 選項會自動建立。

### 共同 property（三個 database 都要）

| Property | 類型 |
|---|---|
| 提交日期 | Date |
| 跟進狀態 | Select（新提交／審閱中／已聯絡／合適／已結束／垃圾） |
| 表單版本 | Text |
| Lead ID | Text |
| Submission ID | Text |
| 來源 | Select |
| UTM | Text |
| Admin | URL |
| TEST | Checkbox |

### Generic CSC（計劃書 §6 指定欄位）

| Property | 類型 | 來源 |
|---|---|---|
| 姓名 | Title | G01 |
| WhatsApp | Phone | G02 |
| 電郵 | Email | G03 |
| 行業 | Select | G05 |
| 創業階段 | Select | G06 |
| 團隊規模 | Select | G07 |
| 三個痛點 | Multi-select | G08 |
| 首要問題 | Select | G09 |
| 90 日目標 | Text | G11（截至 2000 字） |
| 意向支援 | Select | G17 |
| 認識渠道 | Select | G18 |

### High-ticket（身份、標籤與狀態；長答只在 Admin）

| Property | 類型 | 來源 |
|---|---|---|
| 姓名 | Title | Q01 |
| 公司 | Text | Q02 |
| 角色 / 語言 / 領域 / 營運年期 / 團隊規模 / 據點 / 階段 / 月營業額 | Select | Q03 / Q05 / Q06 / Q07 / Q08 / Q09 / Q11 / Q12 |
| 三個問題 | Multi-select | Q13 |
| 救火時數 / 決策權 / 執行負責 / 可投入時間 | Select | Q16 / Q20 / Q21 / Q22 |
| 準備度 | Number | Q23 |
| 支援意向 / 投資範圍 / 期望 | Select | Q24 / Q25 / Q26 |
| 電郵 | Email | Q28 |
| WhatsApp | Phone | Q29 |
| 連結 | URL | Q30 |
| 認識渠道 | Select | Q31 |
| 入口 | Select（公開／Invite） | entry_mode |

Q14、Q15、Q17、Q18、Q19、Q27 及所有模組長答**不會**同步到 Notion；人手覆核請在 Admin 進行。

### Community

| Property | 類型 | 來源 |
|---|---|---|
| 稱呼 | Title | C01 |
| 行業 / 階段 / 最想突破 / 內容意向 | Select | C02 / C03 / C04 / C06 |
| 90 日改變 | Text | C05 |
| 推廣同意 | Checkbox | consent_marketing |

## 行為

- 首次成功同步會建立 page 並記錄 `notion_page_id`；之後重試或 Admin 改狀態會 **update** 同一 page。
- `skipped` = token 或 database id 未設定；`failed` = Notion API 錯誤（錯誤原文記錄在 `notion_sync_log`）。
- Admin →「Notion」→「重試未同步」每次處理最多 25 個；非 production 環境只重試 TEST 資料。
