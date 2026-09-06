import type { FormDefinition } from "@/engine/types";

/**
 * Page 3｜加入 Carey 創業資訊群前的 1 分鐘了解（Community 7 題）
 * Low-friction entry. Never collects revenue / budget / team detail.
 */
export const communityV1: FormDefinition = {
  schemaVersion: 1,
  slug: "community",
  title: "加入 Carey 創業資訊群前的 1 分鐘了解",
  intro:
    "多謝你想加入 Carey 創業資訊群。花約 1 分鐘分享現況，完成後即可取得 Community 加入連結。這是低阻力的了解表，不是資格考核或申請。",
  submitLabel: "取得加入連結",
  settings: { honeypot: true, turnstile: false, estimatedMinutes: "1" },
  questions: [
    { id: "C01", type: "short_text", label: "你希望我們怎樣稱呼你？", required: true, maxLength: 80 },
    {
      id: "C02", type: "single_select", label: "你目前主要從事哪一個行業？", required: true, tag: true,
      options: [
        { value: "beauty", label: "美容" },
        { value: "medical_aesthetics", label: "醫療美容" },
        { value: "health", label: "健康" },
        { value: "wellness", label: "養生" },
        { value: "education", label: "教育" },
        { value: "training", label: "培訓" },
        { value: "consulting_professional", label: "顧問或專業服務" },
        { value: "other_service", label: "其他服務業" },
        { value: "preparing", label: "準備創業" },
      ],
    },
    {
      id: "C03", type: "single_select", label: "你目前最接近哪一個階段？", required: true, tag: true,
      options: [
        { value: "preparing", label: "準備開始" },
        { value: "started_unstable", label: "已開始但未穩定" },
        { value: "bottleneck", label: "已營運但遇到瓶頸" },
        { value: "team_scaling", label: "已有團隊，想擴張" },
      ],
    },
    {
      id: "C04", type: "single_select", label: "你現在最想先突破哪一個問題？", required: true, tag: true,
      options: [
        { value: "positioning_brand", label: "定位與品牌" },
        { value: "leads_sales", label: "客源與成交" },
        { value: "retention_sop", label: "回購與服務 SOP" },
        { value: "pricing_margin", label: "定價與利潤" },
        { value: "team_delegation", label: "團隊與授權" },
        { value: "other", label: "其他" },
      ],
    },
    { id: "C05", type: "short_text", label: "未來 90 日，你最希望看到哪一個具體改變？", required: true, maxLength: 200, placeholder: "例：穩定查詢、加價不流失客人、取回更多時間", tag: false },
    {
      id: "C06", type: "single_select", label: "你想優先收到哪類內容？", required: true, tag: true,
      options: [
        { value: "csc_info", label: "CSC 課程資訊" },
        { value: "practical_content", label: "創業實戰乾貨" },
        { value: "diagnosis_advisory", label: "1:1 策略診斷或顧問資訊" },
        { value: "all", label: "全部都想了解" },
      ],
    },
    {
      id: "C07", type: "consent", label: "私隱、資料使用與推廣同意", required: true,
      items: [
        { key: "application", label: "我已閱讀並同意私隱聲明，並同意 Carey 團隊按聲明使用我提交的資料。", required: true, default: false, link: { label: "私隱聲明", href: "/privacy" } },
        { key: "marketing", label: "我願意接收 Carey 的課程、商業教育內容及推廣訊息。", required: false, default: false },
      ],
    },
  ],
  success: {
    headline: "多謝你！你的 Community 加入連結已準備好",
    body: "按下面按鈕即可加入 Carey 創業資訊群。",
    primaryCta: { label: "立即加入 WhatsApp Community", href: { setting: "whatsapp_invite_url" }, style: "primary" },
    secondary: [
      { when: { questionId: "C06", op: "eq", value: "csc_info" }, cta: { label: "了解 CSC 課程資訊", href: { setting: "csc_info_url" } } },
      { when: { questionId: "C06", op: "eq", value: "diagnosis_advisory" }, cta: { label: "日後可完成創辦人增長與團隊診斷申請", href: "/f/high_ticket" } },
    ],
  },
};
