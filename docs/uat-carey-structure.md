# UAT 驗收與 Sign-off 結構

呢份嘢係**規格**，唔係成品。驗收工具由 Jeff 另外自己砌；呢度定義佢要有咩結構、狀態同規則，
令到最後簽出嚟嗰張 sign-off 係有意義、日後拗得清嘅。

測試內容本身喺 `docs/uat-carey-items.json`（40 項，可直接 import）。

---

## 一、範圍同角色

一次驗收 = 一個 **Run**，對住**一個環境**、**一個版本**。

| 角色 | 做咩 | 簽咩 |
|---|---|---|
| **Carey／Jojo** | 當客人填問卷、自己操作 Admin、獨立完成交接驗證 | 簽「我驗收過」 |
| **Jeff** | 示範系統行為、開帳戶、清場 | 副簽「我交付咗」 |

責任邊界要寫清楚：Carey 判斷**內容**同**佢自己做唔做得到**；Carey 判斷唔到密碼雜湊、原子寫入呢類嘢，
所以 C 節嗰啲佢簽嘅係「**我見過、我明白**」，唔係「我保證正確」。呢個分別要反映喺聲明文字度。

---

## 二、資料模型

```
Run                          一次驗收
  id
  env                        "production" | "staging"
  baseUrl                    https://csc-questionnaire.cs-570.workers.dev
  appVersion                 git commit sha（驗收當日 deploy 嗰個）
  formVersions               { community: "form_community_v1",
                               generic_csc: "form_generic_csc_v1",
                               high_ticket: "form_high_ticket_v1" }
  participants[]             { name, role, org }
  startedAt / finishedAt
  status                     draft | in_progress | signed | void

Section                      節（0 / A / B / C / D / E）
  key, title, actor, note, signGroup

Item                         一條測試（靜態內容，唔會因 Run 而變）
  id                         "a6"
  sectionKey
  kind                       prereq | test
  title
  actor                      carey | jeff | both
  action[]                   做乜（步驟）
  expect[]                   應該見到乜
  deps[]                     resend | notion | domain | admin_account
  weight                     blocker | major | minor | content

Result                       Run × Item
  runId, itemId
  status                     todo | pass | issue | skip | na
  note                       有 issue 就必填
  evidence[]                 截圖／URL（可選）
  markedBy, markedAt

SignOff                      一節或者最終
  runId
  scope                      "A" | "B+C" | "D" | "final"
  statementVersion           聲明文字嘅版本（文字改咗要留返舊簽名對應邊個版本）
  signer                     { name, role, org }
  signedAt
  acceptedExceptions[]       { itemId, reason, owner, dueDate }
  countersign                { name, role, signedAt }
  snapshot                   簽嗰刻嘅 appVersion + formVersions + 各項 status 統計
```

**`snapshot` 係重點。** 冇佢，三個月後題目改咗版本，冇人講得出當初簽嗰陣簽咗啲乜。
簽落去嗰刻要凍結：commit sha、三個 form version id、每節嘅 pass／issue／skip 數。

---

## 三、狀態規則

**Item**
- 預設 `todo`
- `issue` 一定要有 `note`（唔寫就唔俾 mark）
- `skip` 要有理由；`na` 專門俾「依賴未 ready」嗰啲（例如 Resend 未驗證好 → b7 係 `na` 唔係 `skip`）

**Section 可以簽嘅條件**
- 該節所有 item 都有結論（**零個 `todo`**）
- 所有 `issue` 都要二選一：**修好重測轉 pass**，或者**寫入 `acceptedExceptions`**
- `weight: blocker` 嘅 item 有 `issue` 而未修好 → **唔准簽**，連 accepted exception 都唔准

**最終 sign-off 條件**
- A、B+C、D 三節都已簽
- D 節（交接）**全部 pass**，一個 exception 都唔准 —— 呢節係交接嘅唯一證明
- E 節（清場）完成
- `/admin/preflight` 0 項 BLOCKER

---

## 四、Sign-off 點解要分節簽

分四次簽，唔好最後淨係簽一張紙：

| 簽 | 範圍 | 簽嗰陣 |
|---|---|---|
| ① 內容驗收 | A 節 | Carey 填完三份問卷即刻簽 |
| ② 營運操作 | B + C 節 | Carey 自己撳完 Admin 之後 |
| ③ 交接 | D 節 | 降走 Jeff 權限、Carey 獨立做完之後 |
| ④ 最終驗收 | 全部 | 清場完 |

三個好處：
1. **責任範圍清楚** —— Carey 簽內容嗰張，日後題目寫錯字唔會變成「系統有 bug」
2. **簽得落手** —— 一次過簽 40 項，佢實係求其撳；分開四次，每次 5–10 項，佢會真係睇
3. **中途卡住唔會全盤停** —— Resend 未 ready，②③ 可以照簽，最終嗰張等埋

---

## 五、聲明文字（可以照用）

`statementVersion: "2026-09"`

### ① 內容驗收

> 我已逐條閱讀三份問卷嘅題目、選項、同意條款同成功頁文案，確認內容準確、語氣符合 Acaredemy
> 品牌，並同意以此版本對外使用。我明白題目 ID 一經發布唔可以改類型或重用，日後修改會產生新版本，
> 而舊提交會繼續以舊版本顯示。

### ② 營運操作

> 我已親自操作 Admin：查閱提交、修改跟進狀態、匯出 CSV。我亦見過系統喺登入鎖定、題目改版、
> 以及 Notion 同步失敗時嘅行為，並明白遇到問題時應該點處理。
>
> 我理解呢節部分項目由 Jeff 示範，我確認嘅係「我已見過並明白」，唔係對技術正確性作出保證。

### ③ 交接（最重要嗰張）

> 我確認以下營運資產由我方帳戶持有並可獨立操作：Cloudflare（Worker 及 D1）、Admin owner 帳戶、
> Resend 寄件網域、Notion workspace。
>
> 我已喺**冇 Jeff 協助**嘅情況下，親自完成登入、查閱提交、修改狀態、匯出 CSV、匯出 D1 備份。
> 我確認屬於我方嘅題目、內容及資料可以隨時完整取回。

### ④ 最終驗收

> 以上各節已完成，測試資料已清除，上線前檢查冇 BLOCKER。本系統符合驗收要求，同意上線。
> 未解決事項已記錄於下表，並附處理安排及限期。

### Jeff 副簽（每張都要）

> 本人已按上述範圍交付，並已移除或降低本人喺相關營運資產嘅權限。

---

## 六、未解決事項（acceptedExceptions）

唔好淨係打隻剔就算。每一條要四樣嘢，缺一樣都唔准簽：

| 欄 | 點解要 |
|---|---|
| `itemId` | 指返邊一項 |
| `reason` | 點解可以帶住上線 |
| `owner` | 邊個負責跟 |
| `dueDate` | 幾時前要處理好 |

`weight: blocker` 嘅項目**唔准**入呢張表 —— 唔係「接受」，係「未做完」。

---

## 七、簽嗰陣要自動記低嘅嘢

簽名按鈕撳落去，系統要自己夾硬記低（唔好靠人手填）：

- `appVersion` —— 驗收當日 production 嘅 git commit sha
- `formVersions` —— 三個 form version id（目前全部係 `_v1`）
- `baseUrl` —— `https://csc-questionnaire.cs-570.workers.dev`（將來換咗 custom domain 要記新嗰個）
- 每節 pass / issue / skip / na 統計
- 簽名時間（UTC + 香港時間都記）

---

## 八、結果要流返去邊

簽完之後，將 Run 摘要抄返入 `docs/uat-tracker.md`：
D 節七項全綠 = 計劃書 Gate 4 #9 完成。呢個係整個交接嘅正式終點。
