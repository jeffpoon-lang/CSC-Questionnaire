import type { FormDefinition } from "@/engine/types";

/**
 * Page 1｜了解你的創業現況（Generic CSC 20 題）
 * Question IDs G01–G20 are FIXED. Never reuse an id with a different meaning.
 */
export const genericCscV1: FormDefinition = {
  schemaVersion: 1,
  slug: "generic_csc",
  title: "了解你的創業現況",
  intro:
    "花約 6–8 分鐘，協助 Carey 團隊了解你現時的業務階段、最想突破的問題與學習目標，從而提供較適合的 CSC 課程與社群資訊。提交不代表獲接納任何課程、諮詢或顧問服務。",
  submitLabel: "提交",
  settings: { honeypot: true, turnstile: false, estimatedMinutes: "6–8" },
  questions: [
    { id: "G01", type: "short_text", label: "你希望我們怎樣稱呼你？", required: true, maxLength: 80 },
    { id: "G02", type: "phone", label: "WhatsApp 號碼（請包括國家／地區碼）", required: true, defaultCountry: "HK", hint: "例如 +852 9123 4567" },
    { id: "G03", type: "email", label: "聯絡電郵", required: true },
    { id: "G04", type: "short_text", label: "你目前主要在哪一個城市及國家／地區營運？", required: true, maxLength: 120 },
    {
      id: "G05", type: "single_select", label: "你的業務最接近哪一個行業？", required: true, tag: true,
      options: [
        { value: "beauty", label: "美容" },
        { value: "medical_aesthetics", label: "醫療美容" },
        { value: "health_wellness", label: "健康養生" },
        { value: "education_training", label: "教育培訓" },
        { value: "consulting_professional", label: "顧問或專業服務" },
        { value: "other_service", label: "其他服務業" },
        { value: "not_started", label: "尚未正式開業" },
      ],
    },
    {
      id: "G06", type: "single_select", label: "你目前最接近哪一個創業階段？", required: true, tag: true,
      options: [
        { value: "idea", label: "有想法，未開始" },
        { value: "pre_launch", label: "已有產品或服務，未正式營運" },
        { value: "bottleneck", label: "營運中，但遇到瓶頸" },
        { value: "scaling", label: "相對穩定，準備擴張" },
      ],
    },
    {
      id: "G07", type: "single_select", label: "目前有多少名團隊成員，包括你自己？", required: true, tag: true,
      options: [
        { value: "1", label: "一人" },
        { value: "2_5", label: "2–5 人" },
        { value: "6_15", label: "6–15 人" },
        { value: "16_plus", label: "16 人或以上" },
      ],
    },
    {
      id: "G08", type: "multi_select", label: "現時最影響你業務的問題是甚麼？最多選三項。", required: true, tag: true, maxSelections: 3,
      options: [
        { value: "positioning", label: "定位與方向" },
        { value: "brand_appeal", label: "品牌吸引力" },
        { value: "leads_sales", label: "客源與成交" },
        { value: "pricing_margin", label: "客人講價與利潤" },
        { value: "retention_crm", label: "回購、轉介或 CRM" },
        { value: "sop_experience", label: "服務 SOP 或體驗" },
        { value: "team_delegation", label: "招聘、培訓、留人或授權" },
        { value: "cost_data_scaling", label: "成本、數據或擴張判斷" },
        { value: "other", label: "其他" },
      ],
    },
    {
      id: "G09", type: "single_select", label: "若 Carey 只能先協助你釐清一件事，你最想先處理哪一項？", required: true, tag: true,
      optionsFrom: { questionId: "G08", append: [{ value: "other", label: "其他" }], emptyBehavior: "hide" },
    },
    { id: "G10", type: "long_text", label: "請簡述你目前在這個問題上遇到的情況。", required: true, piiHint: true, rows: 5 },
    { id: "G11", type: "long_text", label: "未來 90 日，如果出現甚麼具體改變，你會覺得自己正走在正確方向？", required: true, piiHint: true, hint: "鼓勵寫下數字、行為或可觀察的成果。", rows: 4 },
    { id: "G12", type: "long_text", label: "你希望在未來 1–3 年把事業發展成怎樣？", required: true, piiHint: true, rows: 4 },
    { id: "G13", type: "long_text", label: "過去一年，你曾經嘗試甚麼方法處理這個問題？結果如何？", required: false, piiHint: true, rows: 4 },
    {
      id: "G14", type: "single_select", label: "你與團隊每週可以實際投入多少時間學習及落實新系統？", required: true, tag: true,
      options: [
        { value: "lt2", label: "少於 2 小時" },
        { value: "2_5", label: "2–5 小時" },
        { value: "6_10", label: "6–10 小時" },
        { value: "11_plus", label: "11 小時以上" },
        { value: "unsure", label: "未能確定" },
      ],
    },
    {
      id: "G15", type: "multi_select", label: "你最希望先了解 CSC 系統的哪一個部分？最多選兩項。", required: true, tag: true, maxSelections: 2,
      options: [
        { value: "talent_positioning", label: "天賦定位與方向" },
        { value: "brand_visual", label: "高顏值國際品牌" },
        { value: "business_framework", label: "商業框架與吸客留客" },
        { value: "service_sop", label: "服務 SOP 與高端體驗" },
        { value: "team_legacy", label: "團隊擴張與傳承" },
      ],
    },
    { id: "G16", type: "long_text", label: "你希望客人因為你的產品或服務，得到甚麼改變或感受？", required: false, piiHint: true, rows: 3 },
    {
      id: "G17", type: "single_select", label: "當你找到合適的下一步，現階段較想了解哪一種支援？", required: true, tag: true,
      options: [
        { value: "community", label: "免費 Community" },
        { value: "full_csc", label: "完整 CSC 課程" },
        { value: "diagnosis", label: "策略診斷" },
        { value: "advisory", label: "長期顧問或團隊支援" },
        { value: "unsure", label: "未確定" },
      ],
    },
    {
      id: "G18", type: "single_select", label: "你從哪一個渠道認識 Carey？", required: true, tag: true, prefillFromQuery: "src",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "whatsapp_community", label: "WhatsApp Community" },
        { value: "referral", label: "朋友或客戶轉介" },
        { value: "event_media", label: "活動或媒體" },
        { value: "existing_client", label: "現有課程或服務客戶" },
        { value: "other", label: "其他" },
      ],
    },
    {
      id: "G19", type: "consent", label: "私隱及資料使用同意", required: true,
      hint: "請勿提交不必要的第三方個人資料。",
      items: [
        { key: "application", label: "我已閱讀並同意私隱聲明，並同意 Carey 團隊按聲明使用我提交的資料作課程及社群跟進之用。", required: true, default: false, link: { label: "私隱聲明", href: "/privacy" } },
      ],
    },
    {
      id: "G20", type: "consent", label: "推廣訊息", required: false,
      items: [
        { key: "marketing", label: "我願意接收 Carey 的課程、商業教育內容及推廣訊息。", required: false, default: false },
      ],
    },
  ],
  success: {
    headline: "多謝你的分享",
    body: "我們已收到你的資料。先加入 Carey 創業資訊群，取得貼近你需要的內容。",
    primaryCta: { label: "加入 WhatsApp Community", href: { setting: "whatsapp_invite_url" }, style: "primary" },
    secondary: [
      { when: { questionId: "G17", op: "eq", value: "full_csc" }, cta: { label: "了解 CSC 課程資訊", href: { setting: "csc_info_url" } } },
    ],
    notes: [
      { when: { questionId: "G17", op: "in", value: ["diagnosis", "advisory"] }, text: "團隊將先閱讀你的資料，再聯絡合適的下一步。" },
    ],
  },
};
