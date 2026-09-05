# Form Data Dictionary（由 canonical 定義自動生成）

生成時間：2026-09-05T12:45:27.731Z。請勿手動編輯；修改 `src/forms/canonical/*.ts` 後執行 `pnpm docs:generate`。

## 共同追蹤欄位（每次提交）

| 欄位 | 說明 |
|---|---|
| lead_id | 以電郵／電話合併的潛在客 ID |
| submission_id / public_token | 提交 ID；public_token 只用於成功頁 |
| form_type / form_version / form_version_id | 表單 slug 與提交當時的版本（immutable snapshot） |
| module_ids / module_version_ids / module_versions | 經邀請連結附加的 Tailored Module 及其版本 |
| entry_mode / invite_link_id | public 或 invite |
| created_at / submitted_at | 開始填寫與提交時間 |
| source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, cta, referrer | 來源追蹤（由 URL 參數與 sessionStorage 捕捉） |
| consent_application / consent_marketing | 資料使用同意（必填）／推廣同意（預設否） |
| internal_status / review_owner | 內部處理狀態與負責人 |
| duplicate_of | 同一 lead 在 duplicate_window_days 內重覆提交同一表單時指向上一次提交 |
| notion_sync_status / notion_page_id | Notion 同步狀態與頁面 ID |
| is_test | 非 production 環境或 URL 帶 ?test=1 的提交 |

## 了解你的創業現況（`generic_csc`）

- 題數：20
- 預計時間：6–8 分鐘
- 對外說明：花約 6–8 分鐘，協助 Carey 團隊了解你現時的業務階段、最想突破的問題與學習目標，從而提供較適合的 CSC 課程與社群資訊。提交不代表獲接納任何課程、諮詢或顧問服務。
- 成功頁：多謝你的分享；主要 CTA「加入 WhatsApp Community」→ setting:whatsapp_invite_url
- 次要 CTA：當 G17 eq "full_csc" → 「了解 CSC 課程資訊」
- 提示：當 G17 in ["diagnosis","advisory"] → 「團隊將先閱讀你的資料，再聯絡合適的下一步。」

| ID | 題目 | 題型 | 規則 | 選項（value／label） |
|---|---|---|---|---|
| G01 | 你希望我們怎樣稱呼你？ | 短答 | 必填；上限 80 字 |  |
| G02 | WhatsApp 號碼（請包括國家／地區碼） | 電話（E.164） | 必填；預設國家 HK |  |
| G03 | 聯絡電郵 | 電郵 | 必填 |  |
| G04 | 你目前主要在哪一個城市及國家／地區營運？ | 短答 | 必填；上限 120 字 |  |
| G05 | 你的業務最接近哪一個行業？ | 單選 | 必填；後台標籤 | `beauty` 美容<br>`medical_aesthetics` 醫療美容<br>`health_wellness` 健康養生<br>`education_training` 教育培訓<br>`consulting_professional` 顧問或專業服務<br>`other_service` 其他服務業<br>`not_started` 尚未正式開業 |
| G06 | 你目前最接近哪一個創業階段？ | 單選 | 必填；後台標籤 | `idea` 有想法，未開始<br>`pre_launch` 已有產品或服務，未正式營運<br>`bottleneck` 營運中，但遇到瓶頸<br>`scaling` 相對穩定，準備擴張 |
| G07 | 目前有多少名團隊成員，包括你自己？ | 單選 | 必填；後台標籤 | `1` 一人<br>`2_5` 2–5 人<br>`6_15` 6–15 人<br>`16_plus` 16 人或以上 |
| G08 | 現時最影響你業務的問題是甚麼？最多選三項。 | 多選 | 必填；最多 3 項；後台標籤 | `positioning` 定位與方向<br>`brand_appeal` 品牌吸引力<br>`leads_sales` 客源與成交<br>`pricing_margin` 客人講價與利潤<br>`retention_crm` 回購、轉介或 CRM<br>`sop_experience` 服務 SOP 或體驗<br>`team_delegation` 招聘、培訓、留人或授權<br>`cost_data_scaling` 成本、數據或擴張判斷<br>`other` 其他 |
| G09 | 若 Carey 只能先協助你釐清一件事，你最想先處理哪一項？ | 單選 | 必填；選項來自 G08 已選項 + 其他；後台標籤 |  |
| G10 | 請簡述你目前在這個問題上遇到的情況。 | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| G11 | 未來 90 日，如果出現甚麼具體改變，你會覺得自己正走在正確方向？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| G12 | 你希望在未來 1–3 年把事業發展成怎樣？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| G13 | 過去一年，你曾經嘗試甚麼方法處理這個問題？結果如何？ | 長答 | 選填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| G14 | 你與團隊每週可以實際投入多少時間學習及落實新系統？ | 單選 | 必填；後台標籤 | `lt2` 少於 2 小時<br>`2_5` 2–5 小時<br>`6_10` 6–10 小時<br>`11_plus` 11 小時以上<br>`unsure` 未能確定 |
| G15 | 你最希望先了解 CSC 系統的哪一個部分？最多選兩項。 | 多選 | 必填；最多 2 項；後台標籤 | `talent_positioning` 天賦定位與方向<br>`brand_visual` 高顏值國際品牌<br>`business_framework` 商業框架與吸客留客<br>`service_sop` 服務 SOP 與高端體驗<br>`team_legacy` 團隊擴張與傳承 |
| G16 | 你希望客人因為你的產品或服務，得到甚麼改變或感受？ | 長答 | 選填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| G17 | 當你找到合適的下一步，現階段較想了解哪一種支援？ | 單選 | 必填；後台標籤 | `community` 免費 Community<br>`full_csc` 完整 CSC 課程<br>`diagnosis` 策略診斷<br>`advisory` 長期顧問或團隊支援<br>`unsure` 未確定 |
| G18 | 你從哪一個渠道認識 Carey？ | 單選 | 必填；可由 URL ?src= 預填；後台標籤 | `instagram` Instagram<br>`whatsapp_community` WhatsApp Community<br>`referral` 朋友或客戶轉介<br>`event_media` 活動或媒體<br>`existing_client` 現有課程或服務客戶<br>`other` 其他 |
| G19 | 私隱及資料使用同意 | 同意勾選 | 必填；application（必填） |  |
| G20 | 推廣訊息 | 同意勾選 | 選填；marketing（選填，預設不勾選） |  |

## 創辦人增長與團隊診斷申請（`high_ticket`）

- 題數：34
- 預計時間：15–18 分鐘
- 對外說明：預計 15–18 分鐘。此申請協助 Carey 團隊了解你的業務現況、關鍵瓶頸、問題代價及決策準備，從而判斷是否適合進入下一步策略診斷或其他支援。提交不代表獲接納、獲得諮詢安排或保證任何成果。
- 成功頁：多謝你的申請；無 CTA（只顯示訊息）

| ID | 題目 | 題型 | 規則 | 選項（value／label） |
|---|---|---|---|---|
| Q01 | 你的全名是？ | 短答 | 必填；上限 100 字 |  |
| Q02 | 公司或品牌名稱是？ | 短答 | 必填；上限 120 字 |  |
| Q03 | 你在公司中的角色最接近哪一項？ | 單選 | 必填；後台標籤 | `founder` 創辦人<br>`cofounder` 共同創辦人<br>`partner` 合夥人<br>`professional_founder` 專業人士兼創辦人<br>`senior_manager` 高級管理人<br>`other` 其他 |
| Q04 | 你主要在哪一個城市及國家／地區營運？ | 短答 | 必填；上限 120 字 |  |
| Q05 | 你偏好使用哪一種諮詢語言？ | 單選 | 必填；後台標籤 | `cantonese` 粵語<br>`english` 英語<br>`mandarin` 普通話 |
| Q06 | 你的業務最接近哪一個領域？ | 單選 | 必填；後台標籤 | `medical_aesthetics` 醫療美容<br>`specialist_clinic` 專科診所<br>`beauty` 美容<br>`health` 健康<br>`wellness` 養生<br>`education` 教育<br>`training` 培訓<br>`consulting` 顧問<br>`other_professional` 其他專業服務<br>`other` 其他<br>`not_started` 未正式開業 |
| Q07 | 公司正式營運了多久？ | 單選 | 必填；後台標籤 | `not_started` 未開業<br>`lt1` 少於 1 年<br>`1_3` 1–3 年<br>`4_7` 4–7 年<br>`8_15` 8–15 年<br>`16_plus` 16 年以上 |
| Q08 | 公司目前有多少名團隊成員，包括你自己？ | 單選 | 必填；後台標籤 | `1` 一人<br>`2_5` 2–5 人<br>`6_15` 6–15 人<br>`16_30` 16–30 人<br>`31_plus` 31 人以上 |
| Q09 | 公司目前有多少個固定營運據點、分店或服務中心？ | 單選 | 必填；後台標籤 | `none_remote` 無／全遙距<br>`1` 一個<br>`2` 兩個<br>`3_5` 3–5 個<br>`6_plus` 6 個以上 |
| Q10 | 現時誰對日常營運結果負主要責任？ | 單選 | 必填；後台標籤 | `me` 我本人<br>`one_manager` 一名主管或經理<br>`departments` 不同部門各自負責<br>`partner_family` 合夥人或家人協助<br>`no_clear_owner` 沒有清晰負責人 |
| Q11 | 哪一句最能描述公司現階段？ | 單選 | 必填；後台標籤 | `starting` 剛起步<br>`growing_dependent` 增長，但愈來愈依賴我<br>`stagnant_margin` 收入停滯或利潤受壓<br>`chaotic` 團隊或營運混亂<br>`stable_scaling` 運作穩定，準備擴張 |
| Q12 | 公司每月平均營業額大約在哪個範圍？ | 單選 | 必填；後台標籤 | `none` 未有收入<br>`lt_6500` USD 6,500 以下<br>`6501_20000` USD 6,501–20,000<br>`20001_65000` USD 20,001–65,000<br>`65001_130000` USD 65,001–130,000<br>`gt_130000` USD 130,000 以上<br>`undisclosed` 不方便透露 |
| Q13 | 現時最影響公司增長的三個問題是甚麼？最多選三項。 | 多選 | 必填；最多 3 項；後台標籤 | `positioning_value` 定位與高價值<br>`enquiry_conversion` 查詢與成交<br>`followup_retention_journey` 跟進、回購、轉介與服務旅程<br>`hiring_training_standards` 招聘、培訓與服務標準<br>`manager_accountability` 主管責任<br>`founder_firefighting` 創辦人救火<br>`revenue_margin_cost_data_scaling` 收入、利潤、成本、數據與擴張<br>`other` 其他 |
| Q14 | 如果 Carey 只能先協助你釐清一個問題，你最希望先處理甚麼？為甚麼是現在？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| Q15 | 過去十二個月，你曾經嘗試甚麼方法？結果如何？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| Q16 | 你每週大約有多少小時用於追進度、處理突發事件，或回答本應由團隊處理的問題？ | 單選 | 必填；後台標籤 | `0_4` 0–4 小時<br>`5_10` 5–10 小時<br>`11_20` 11–20 小時<br>`21_30` 21–30 小時<br>`31_plus` 31 小時以上<br>`unsure` 不確定 |
| Q17 | 如果每週可以穩定取回一個工作天，你會優先把時間投放在哪一項高價值工作？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| Q18 | 這個問題目前對收入、成本、團隊、客戶體驗、個人精力或家庭生活造成了甚麼具體影響？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| Q19 | 未來 90 日出現哪些可觀察改變，才代表公司走在正確方向？ | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；敏感：不入 Email |  |
| Q20 | 誰擁有重大營運改變及相關投資的最終決策權？ | 單選 | 必填；後台標籤 | `me` 我可以決定<br>`with_partner` 與合夥人共同決定<br>`needs_approval` 需其他人或董事會批准<br>`no_authority` 我無最終決策權 |
| Q21 | 如果開始合作，誰會負責在公司內部落實相關決定？ | 單選 | 必填；後台標籤 | `me` 我本人<br>`assigned_lead` 已確定的主管或項目負責人<br>`me_and_team` 我與團隊共同<br>`nobody_yet` 未有人負責 |
| Q22 | 你與執行團隊每週可以實際投入多少時間？ | 單選 | 必填；後台標籤 | `lt2` 少於 2 小時<br>`2_5` 2–5 小時<br>`6_10` 6–10 小時<br>`11_plus` 11 小時以上<br>`none_now` 目前未能投入 |
| Q23 | 你對未來 30 日內開始作出改變的準備程度為何？ | 量表 | 必填；1–10；後台標籤 |  |
| Q24 | 現階段你認為哪一種支援最有價值？ | 單選 | 必填；後台標籤 | `full_system` 完整系統學習<br>`single_diagnosis` 單次聚焦診斷<br>`long_term_advisory` 長期私人顧問<br>`corporate_training` 企業培訓或轉型<br>`collaboration` 合作構想<br>`unsure` 未確定 |
| Q25 | 如有合適付費路徑、並已了解範圍、責任及合理 ROI 邏輯，你在未來 30 日可認真考慮哪個投資範圍？ | 單選 | 必填；後台標籤 | `free_only` 免費內容<br>`lt_1500` USD 1,500 以下<br>`1501_4000` USD 1,501–4,000<br>`4001_13000` USD 4,001–13,000<br>`13001_40000` USD 13,001–40,000<br>`gt_40000` USD 40,000 以上<br>`paid_diagnosis_first` 先付費診斷後決定<br>`not_ready` 現時未準備 |
| Q26 | 哪一句最接近你對 Carey 的期望？ | 單選 | 必填；後台標籤 | `learn_and_execute` 學完整系統，自行執行<br>`diagnose_prioritise` 診斷及排序<br>`feedback_accountability` 一段時間的客製回饋與問責<br>`done_for_me` 希望代為執行大部分工作<br>`guaranteed_only` 只在保證成果下參與<br>`unsure` 未確定 |
| Q27 | 如你選擇「合作構想」，請說明受眾、概念、雙方角色、預期投入及雙方價值。 | 長答 | 必填；上限 5000 字；顯示第三方資料提醒；只在 Q24 eq "collaboration" 時顯示；敏感：不入 Email |  |
| Q28 | 聯絡電郵 | 電郵 | 必填 |  |
| Q29 | WhatsApp 號碼（包括國家／地區碼） | 電話（E.164） | 必填；預設國家 HK |  |
| Q30 | 公司網站、Instagram 或 LinkedIn 連結 | 連結 | 選填 |  |
| Q31 | 你從哪一個渠道認識 Carey？ | 單選 | 必填；可由 URL ?src= 預填；後台標籤 | `instagram` Instagram<br>`whatsapp_community` WhatsApp 社群<br>`referral` 朋友或客戶轉介<br>`event_media` 活動或媒體<br>`existing_client` 現有課程或服務客戶<br>`other` 其他 |
| Q32 | 私隱及申請資料使用同意 | 同意勾選 | 必填；application（必填） |  |
| Q33 | 成果邊界確認 | 同意勾選 | 必填；outcome_ack（必填） |  |
| Q34 | 推廣訊息 | 同意勾選 | 選填；marketing（選填，預設不勾選） |  |

## 加入 Carey 創業資訊群前的 1 分鐘了解（`community`）

- 題數：7
- 預計時間：1 分鐘
- 對外說明：多謝你想加入 Carey 創業資訊群。花約 1 分鐘分享現況，完成後即可取得 Community 加入連結。這是低阻力的了解表，不是資格考核或申請。
- 成功頁：多謝你！你的 Community 加入連結已準備好；主要 CTA「立即加入 WhatsApp Community」→ setting:whatsapp_invite_url
- 次要 CTA：當 C06 eq "csc_info" → 「了解 CSC 課程資訊」
- 次要 CTA：當 C06 eq "diagnosis_advisory" → 「日後可完成創辦人增長與團隊診斷申請」

| ID | 題目 | 題型 | 規則 | 選項（value／label） |
|---|---|---|---|---|
| C01 | 你希望我們怎樣稱呼你？ | 短答 | 必填；上限 80 字 |  |
| C02 | 你目前主要從事哪一個行業？ | 單選 | 必填；後台標籤 | `beauty` 美容<br>`medical_aesthetics` 醫療美容<br>`health` 健康<br>`wellness` 養生<br>`education` 教育<br>`training` 培訓<br>`consulting_professional` 顧問或專業服務<br>`other_service` 其他服務業<br>`preparing` 準備創業 |
| C03 | 你目前最接近哪一個階段？ | 單選 | 必填；後台標籤 | `preparing` 準備開始<br>`started_unstable` 已開始但未穩定<br>`bottleneck` 已營運但遇到瓶頸<br>`team_scaling` 已有團隊，想擴張 |
| C04 | 你現在最想先突破哪一個問題？ | 單選 | 必填；後台標籤 | `positioning_brand` 定位與品牌<br>`leads_sales` 客源與成交<br>`retention_sop` 回購與服務 SOP<br>`pricing_margin` 定價與利潤<br>`team_delegation` 團隊與授權<br>`other` 其他 |
| C05 | 未來 90 日，你最希望看到哪一個具體改變？ | 短答 | 必填；上限 200 字 |  |
| C06 | 你想優先收到哪類內容？ | 單選 | 必填；後台標籤 | `csc_info` CSC 課程資訊<br>`practical_content` 創業實戰乾貨<br>`diagnosis_advisory` 1:1 策略診斷或顧問資訊<br>`all` 全部都想了解 |
| C07 | 私隱、資料使用與推廣同意 | 同意勾選 | 必填；application（必填）；marketing（選填，預設不勾選） |  |
