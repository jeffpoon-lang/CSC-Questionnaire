import type { FormDefinition } from "@/engine/types";

/**
 * Page 2｜創辦人增長與團隊診斷申請（High-ticket 34 題 Core）
 * Public default contains ONLY Q01–Q34. Tailored modules are attached per
 * invite link by Admin and never appear on the public URL.
 */
export const highTicketV1: FormDefinition = {
  schemaVersion: 1,
  slug: "high_ticket",
  title: "創辦人增長與團隊診斷申請",
  intro:
    "預計 15–18 分鐘。此申請協助 Carey 團隊了解你的業務現況、關鍵瓶頸、問題代價及決策準備，從而判斷是否適合進入下一步策略診斷或其他支援。提交不代表獲接納、獲得諮詢安排或保證任何成果。",
  submitLabel: "提交申請",
  settings: { honeypot: true, turnstile: false, estimatedMinutes: "15–18" },
  questions: [
    { id: "Q01", type: "short_text", label: "你的全名是？", required: true, maxLength: 100, section: "基本資料" },
    { id: "Q02", type: "short_text", label: "公司或品牌名稱是？", required: true, maxLength: 120 },
    {
      id: "Q03", type: "single_select", label: "你在公司中的角色最接近哪一項？", required: true, tag: true,
      options: [
        { value: "founder", label: "創辦人" },
        { value: "cofounder", label: "共同創辦人" },
        { value: "partner", label: "合夥人" },
        { value: "professional_founder", label: "專業人士兼創辦人" },
        { value: "senior_manager", label: "高級管理人" },
        { value: "other", label: "其他" },
      ],
    },
    { id: "Q04", type: "short_text", label: "你主要在哪一個城市及國家／地區營運？", required: true, maxLength: 120 },
    {
      id: "Q05", type: "single_select", label: "你偏好使用哪一種諮詢語言？", required: true, tag: true,
      options: [
        { value: "cantonese", label: "粵語" },
        { value: "english", label: "英語" },
        { value: "mandarin", label: "普通話" },
      ],
    },
    {
      id: "Q06", type: "single_select", label: "你的業務最接近哪一個領域？", required: true, tag: true, section: "業務現況",
      options: [
        { value: "medical_aesthetics", label: "醫療美容" },
        { value: "specialist_clinic", label: "專科診所" },
        { value: "beauty", label: "美容" },
        { value: "health", label: "健康" },
        { value: "wellness", label: "養生" },
        { value: "education", label: "教育" },
        { value: "training", label: "培訓" },
        { value: "consulting", label: "顧問" },
        { value: "other_professional", label: "其他專業服務" },
        { value: "other", label: "其他" },
        { value: "not_started", label: "未正式開業" },
      ],
    },
    {
      id: "Q07", type: "single_select", label: "公司正式營運了多久？", required: true, tag: true,
      options: [
        { value: "not_started", label: "未開業" },
        { value: "lt1", label: "少於 1 年" },
        { value: "1_3", label: "1–3 年" },
        { value: "4_7", label: "4–7 年" },
        { value: "8_15", label: "8–15 年" },
        { value: "16_plus", label: "16 年以上" },
      ],
    },
    {
      id: "Q08", type: "single_select", label: "公司目前有多少名團隊成員，包括你自己？", required: true, tag: true,
      options: [
        { value: "1", label: "一人" },
        { value: "2_5", label: "2–5 人" },
        { value: "6_15", label: "6–15 人" },
        { value: "16_30", label: "16–30 人" },
        { value: "31_plus", label: "31 人以上" },
      ],
    },
    {
      id: "Q09", type: "single_select", label: "公司目前有多少個固定營運據點、分店或服務中心？", required: true, tag: true,
      options: [
        { value: "none_remote", label: "無／全遙距" },
        { value: "1", label: "一個" },
        { value: "2", label: "兩個" },
        { value: "3_5", label: "3–5 個" },
        { value: "6_plus", label: "6 個以上" },
      ],
    },
    {
      id: "Q10", type: "single_select", label: "現時誰對日常營運結果負主要責任？", required: true, tag: true,
      options: [
        { value: "me", label: "我本人" },
        { value: "one_manager", label: "一名主管或經理" },
        { value: "departments", label: "不同部門各自負責" },
        { value: "partner_family", label: "合夥人或家人協助" },
        { value: "no_clear_owner", label: "沒有清晰負責人" },
      ],
    },
    {
      id: "Q11", type: "single_select", label: "哪一句最能描述公司現階段？", required: true, tag: true,
      options: [
        { value: "starting", label: "剛起步" },
        { value: "growing_dependent", label: "增長，但愈來愈依賴我" },
        { value: "stagnant_margin", label: "收入停滯或利潤受壓" },
        { value: "chaotic", label: "團隊或營運混亂" },
        { value: "stable_scaling", label: "運作穩定，準備擴張" },
      ],
    },
    {
      id: "Q12", type: "single_select", label: "公司每月平均營業額大約在哪個範圍？", required: true, tag: true,
      options: [
        { value: "none", label: "未有收入" },
        { value: "lt_6500", label: "USD 6,500 以下" },
        { value: "6501_20000", label: "USD 6,501–20,000" },
        { value: "20001_65000", label: "USD 20,001–65,000" },
        { value: "65001_130000", label: "USD 65,001–130,000" },
        { value: "gt_130000", label: "USD 130,000 以上" },
        { value: "undisclosed", label: "不方便透露" },
      ],
    },
    {
      id: "Q13", type: "multi_select", label: "現時最影響公司增長的三個問題是甚麼？最多選三項。", required: true, tag: true, maxSelections: 3, section: "關鍵瓶頸",
      options: [
        { value: "positioning_value", label: "定位與高價值" },
        { value: "enquiry_conversion", label: "查詢與成交" },
        { value: "followup_retention_journey", label: "跟進、回購、轉介與服務旅程" },
        { value: "hiring_training_standards", label: "招聘、培訓與服務標準" },
        { value: "manager_accountability", label: "主管責任" },
        { value: "founder_firefighting", label: "創辦人救火" },
        { value: "revenue_margin_cost_data_scaling", label: "收入、利潤、成本、數據與擴張" },
        { value: "other", label: "其他" },
      ],
    },
    { id: "Q14", type: "long_text", label: "如果 Carey 只能先協助你釐清一個問題，你最希望先處理甚麼？為甚麼是現在？", required: true, piiHint: true, rows: 5 },
    { id: "Q15", type: "long_text", label: "過去十二個月，你曾經嘗試甚麼方法？結果如何？", required: true, piiHint: true, rows: 5 },
    {
      id: "Q16", type: "single_select", label: "你每週大約有多少小時用於追進度、處理突發事件，或回答本應由團隊處理的問題？", required: true, tag: true, section: "問題代價",
      options: [
        { value: "0_4", label: "0–4 小時" },
        { value: "5_10", label: "5–10 小時" },
        { value: "11_20", label: "11–20 小時" },
        { value: "21_30", label: "21–30 小時" },
        { value: "31_plus", label: "31 小時以上" },
        { value: "unsure", label: "不確定" },
      ],
    },
    { id: "Q17", type: "long_text", label: "如果每週可以穩定取回一個工作天，你會優先把時間投放在哪一項高價值工作？", required: true, piiHint: true, hint: "可估計保守的商業價值，或填「希望在策略診斷時計算」。", rows: 4 },
    { id: "Q18", type: "long_text", label: "這個問題目前對收入、成本、團隊、客戶體驗、個人精力或家庭生活造成了甚麼具體影響？", required: true, piiHint: true, rows: 5 },
    { id: "Q19", type: "long_text", label: "未來 90 日出現哪些可觀察改變，才代表公司走在正確方向？", required: true, piiHint: true, hint: "請盡量寫下數字或具體證據。", rows: 4 },
    {
      id: "Q20", type: "single_select", label: "誰擁有重大營運改變及相關投資的最終決策權？", required: true, tag: true, section: "決策與準備度",
      options: [
        { value: "me", label: "我可以決定" },
        { value: "with_partner", label: "與合夥人共同決定" },
        { value: "needs_approval", label: "需其他人或董事會批准" },
        { value: "no_authority", label: "我無最終決策權" },
      ],
    },
    {
      id: "Q21", type: "single_select", label: "如果開始合作，誰會負責在公司內部落實相關決定？", required: true, tag: true,
      options: [
        { value: "me", label: "我本人" },
        { value: "assigned_lead", label: "已確定的主管或項目負責人" },
        { value: "me_and_team", label: "我與團隊共同" },
        { value: "nobody_yet", label: "未有人負責" },
      ],
    },
    {
      id: "Q22", type: "single_select", label: "你與執行團隊每週可以實際投入多少時間？", required: true, tag: true,
      options: [
        { value: "lt2", label: "少於 2 小時" },
        { value: "2_5", label: "2–5 小時" },
        { value: "6_10", label: "6–10 小時" },
        { value: "11_plus", label: "11 小時以上" },
        { value: "none_now", label: "目前未能投入" },
      ],
    },
    { id: "Q23", type: "scale", label: "你對未來 30 日內開始作出改變的準備程度為何？", required: true, min: 1, max: 10, minLabel: "1 = 未準備", maxLabel: "10 = 已準備好", tag: true },
    {
      id: "Q24", type: "single_select", label: "現階段你認為哪一種支援最有價值？", required: true, tag: true,
      options: [
        { value: "full_system", label: "完整系統學習" },
        { value: "single_diagnosis", label: "單次聚焦診斷" },
        { value: "long_term_advisory", label: "長期私人顧問" },
        { value: "corporate_training", label: "企業培訓或轉型" },
        { value: "collaboration", label: "合作構想" },
        { value: "unsure", label: "未確定" },
      ],
    },
    {
      id: "Q25", type: "single_select", label: "如有合適付費路徑、並已了解範圍、責任及合理 ROI 邏輯，你在未來 30 日可認真考慮哪個投資範圍？", required: true, tag: true,
      hint: "此題並非正式報價，只用作了解合適的支援方向。",
      options: [
        { value: "free_only", label: "免費內容" },
        { value: "lt_1500", label: "USD 1,500 以下" },
        { value: "1501_4000", label: "USD 1,501–4,000" },
        { value: "4001_13000", label: "USD 4,001–13,000" },
        { value: "13001_40000", label: "USD 13,001–40,000" },
        { value: "gt_40000", label: "USD 40,000 以上" },
        { value: "paid_diagnosis_first", label: "先付費診斷後決定" },
        { value: "not_ready", label: "現時未準備" },
      ],
    },
    {
      id: "Q26", type: "single_select", label: "哪一句最接近你對 Carey 的期望？", required: true, tag: true,
      options: [
        { value: "learn_and_execute", label: "學完整系統，自行執行" },
        { value: "diagnose_prioritise", label: "診斷及排序" },
        { value: "feedback_accountability", label: "一段時間的客製回饋與問責" },
        { value: "done_for_me", label: "希望代為執行大部分工作" },
        { value: "guaranteed_only", label: "只在保證成果下參與" },
        { value: "unsure", label: "未確定" },
      ],
    },
    {
      id: "Q27", type: "long_text", label: "如你選擇「合作構想」，請說明受眾、概念、雙方角色、預期投入及雙方價值。", required: true, piiHint: true, rows: 5,
      visibleIf: { questionId: "Q24", op: "eq", value: "collaboration" },
    },
    { id: "Q28", type: "email", label: "聯絡電郵", required: true, section: "聯絡方式" },
    { id: "Q29", type: "phone", label: "WhatsApp 號碼（包括國家／地區碼）", required: true, defaultCountry: "HK", hint: "例如 +852 9123 4567" },
    { id: "Q30", type: "url", label: "公司網站、Instagram 或 LinkedIn 連結", required: false },
    {
      id: "Q31", type: "single_select", label: "你從哪一個渠道認識 Carey？", required: true, tag: true, prefillFromQuery: "src",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "whatsapp_community", label: "WhatsApp 社群" },
        { value: "referral", label: "朋友或客戶轉介" },
        { value: "event_media", label: "活動或媒體" },
        { value: "existing_client", label: "現有課程或服務客戶" },
        { value: "other", label: "其他" },
      ],
    },
    {
      id: "Q32", type: "consent", label: "私隱及申請資料使用同意", required: true, section: "同意",
      hint: "請勿填寫員工、病人、客戶或其他第三方的不必要個人資料。",
      items: [
        { key: "application", label: "我已閱讀並同意私隱聲明，並同意 Carey 團隊按聲明使用我提交的申請資料。", required: true, default: false, link: { label: "私隱聲明", href: "/privacy" } },
      ],
    },
    {
      id: "Q33", type: "consent", label: "成果邊界確認", required: true,
      items: [
        { key: "outcome_ack", label: "我明白成果取決於我的決定、執行、團隊及市場環境；提交不代表接納或成果保證。", required: true, default: false },
      ],
    },
    {
      id: "Q34", type: "consent", label: "推廣訊息", required: false,
      items: [
        { key: "marketing", label: "我願意接收 Carey 的課程、商業教育內容及推廣訊息。", required: false, default: false },
      ],
    },
  ],
  success: {
    headline: "多謝你的申請",
    body: "團隊會先閱讀你的資料，再提供合適的下一步。",
  },
};
