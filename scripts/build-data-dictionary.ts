/**
 * Generates docs/data-dictionary.md from the canonical form definitions so the
 * sign-off document can never drift from what is actually seeded.
 */
import { writeFileSync } from "node:fs";
import { canonicalForms } from "../src/forms/canonical";
import type { Condition, FormDefinition, Question } from "../src/engine/types";
import { isSensitive } from "../src/engine/types";

const TYPE_LABEL: Record<Question["type"], string> = {
  short_text: "短答", long_text: "長答", email: "電郵", phone: "電話（E.164）", url: "連結",
  single_select: "單選", multi_select: "多選", scale: "量表", consent: "同意勾選",
};

function cond(c: Condition): string {
  if ("all" in c) return c.all.map(cond).join(" AND ");
  if ("any" in c) return c.any.map(cond).join(" OR ");
  if ("not" in c) return `NOT (${cond(c.not)})`;
  return "value" in c ? `${c.questionId} ${c.op} ${JSON.stringify(c.value)}` : `${c.questionId} ${c.op}`;
}

function rules(q: Question): string {
  const r: string[] = [q.required ? "必填" : "選填"];
  if (q.type === "short_text" || q.type === "long_text") r.push(`上限 ${q.maxLength ?? (q.type === "short_text" ? 200 : 5000)} 字`);
  if (q.type === "long_text" && q.piiHint) r.push("顯示第三方資料提醒");
  if (q.type === "phone") r.push(`預設國家 ${q.defaultCountry}`);
  if (q.type === "multi_select") {
    if (q.maxSelections) r.push(`最多 ${q.maxSelections} 項`);
    if (q.minSelections) r.push(`最少 ${q.minSelections} 項`);
  }
  if (q.type === "scale") r.push(`${q.min}–${q.max}`);
  if (q.type === "consent") r.push(q.items.map((i) => `${i.key}${i.required ? "（必填）" : "（選填，預設不勾選）"}`).join("；"));
  if (q.visibleIf) r.push(`只在 ${cond(q.visibleIf)} 時顯示`);
  if ((q.type === "single_select" || q.type === "multi_select") && q.optionsFrom) r.push(`選項來自 ${q.optionsFrom.questionId} 已選項${q.optionsFrom.append?.length ? ` + ${q.optionsFrom.append.map((o) => o.label).join("、")}` : ""}`);
  if (q.prefillFromQuery) r.push(`可由 URL ?${q.prefillFromQuery}= 預填`);
  if (q.tag) r.push("後台標籤");
  if (isSensitive(q)) r.push("敏感：不入 Email");
  return r.join("；");
}

function options(q: Question): string {
  if (q.type !== "single_select" && q.type !== "multi_select") return "";
  return (q.options ?? []).map((o) => `\`${o.value}\` ${o.label}`).join("<br>");
}

function section(def: FormDefinition): string {
  const lines = [
    `## ${def.title}（\`${def.slug}\`）`,
    "",
    `- 題數：${def.questions.length}`,
    `- 預計時間：${def.settings.estimatedMinutes ?? "—"} 分鐘`,
    `- 對外說明：${def.intro ?? ""}`,
    `- 成功頁：${def.success.headline}${def.success.primaryCta ? `；主要 CTA「${def.success.primaryCta.label}」→ ${typeof def.success.primaryCta.href === "string" ? def.success.primaryCta.href : `setting:${def.success.primaryCta.href.setting}`}` : "；無 CTA（只顯示訊息）"}`,
    ...(def.success.secondary ?? []).map((s) => `- 次要 CTA：當 ${cond(s.when)} → 「${s.cta.label}」`),
    ...(def.success.notes ?? []).map((n) => `- 提示：當 ${cond(n.when)} → 「${n.text}」`),
    "",
    "| ID | 題目 | 題型 | 規則 | 選項（value／label） |",
    "|---|---|---|---|---|",
    ...def.questions.map((q) => `| ${q.id} | ${q.label} | ${TYPE_LABEL[q.type]} | ${rules(q)} | ${options(q)} |`),
    "",
  ];
  return lines.join("\n");
}

const doc = [
  "# Form Data Dictionary（由 canonical 定義自動生成）",
  "",
  `生成時間：${new Date().toISOString()}。請勿手動編輯；修改 \`src/forms/canonical/*.ts\` 後執行 \`pnpm docs:generate\`。`,
  "",
  "## 共同追蹤欄位（每次提交）",
  "",
  "| 欄位 | 說明 |",
  "|---|---|",
  "| lead_id | 以電郵／電話合併的潛在客 ID |",
  "| submission_id / public_token | 提交 ID；public_token 只用於成功頁 |",
  "| form_type / form_version / form_version_id | 表單 slug 與提交當時的版本（immutable snapshot） |",
  "| module_ids / module_version_ids / module_versions | 經邀請連結附加的 Tailored Module 及其版本 |",
  "| entry_mode / invite_link_id | public 或 invite |",
  "| created_at / submitted_at | 開始填寫與提交時間 |",
  "| source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, cta, referrer | 來源追蹤（由 URL 參數與 sessionStorage 捕捉） |",
  "| consent_application / consent_marketing | 資料使用同意（必填）／推廣同意（預設否） |",
  "| internal_status / review_owner | 內部處理狀態與負責人 |",
  "| duplicate_of | 同一 lead 在 duplicate_window_days 內重覆提交同一表單時指向上一次提交 |",
  "| notion_sync_status / notion_page_id | Notion 同步狀態與頁面 ID |",
  "| is_test | 非 production 環境或 URL 帶 ?test=1 的提交 |",
  "",
  ...Object.values(canonicalForms).map(section),
].join("\n");

writeFileSync("docs/data-dictionary.md", doc);
console.log("Wrote docs/data-dictionary.md");
