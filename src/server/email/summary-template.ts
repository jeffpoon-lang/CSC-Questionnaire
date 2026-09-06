import type { Question } from "@/engine/types";
import { isSensitive } from "@/engine/types";
import type { Submission } from "@/db/schema";

export interface SummaryInput {
  submission: Submission;
  formTitle: string;
  questions: Question[];
  adminUrl: string | null;
}

function labelFor(q: Question, v: unknown): string {
  if (q.type === "single_select" || q.type === "multi_select") {
    const opts = q.options ?? [];
    const vals = Array.isArray(v) ? v : [v];
    return vals.map((x) => opts.find((o) => o.value === x)?.label ?? String(x)).join("、");
  }
  if (q.type === "scale") return String(v);
  return String(v);
}

/**
 * Build the summary email. Only tagged select/scale answers appear; anything
 * sensitive (all long_text by default) is NEVER included — the reader opens
 * Admin for that.
 */
export function buildSummary(input: SummaryInput): { subject: string; text: string; html: string } {
  const { submission: s, formTitle, questions, adminUrl } = input;
  const name = s.displayName?.trim() || "（未提供稱呼）";
  const when = new Date(s.submittedAt).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour12: false });

  const tags: Array<[string, string]> = [];
  for (const q of questions) {
    if (isSensitive(q)) continue;
    if (!q.tag) continue;
    const v = s.answersJson[q.id];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    tags.push([q.label, labelFor(q, v)]);
  }

  const meta: Array<[string, string]> = [
    ["表單", formTitle],
    ["稱呼", name],
    ["提交時間（HKT）", when],
    ["來源", [s.source, s.utmSource, s.utmMedium, s.utmCampaign].filter(Boolean).join(" / ") || "—"],
    ["Landing / CTA", [s.landingPage, s.cta].filter(Boolean).join(" · ") || "—"],
    ["入口", s.entryMode === "invite" ? "Invite link" : "公開"],
    ["表單版本", `v${s.formVersion}`],
  ];
  if (s.isTest) meta.unshift(["⚠︎", "TEST 提交"]);
  if (s.duplicateOf) meta.push(["重覆", "此 lead 近期已提交過同一表單"]);

  const subject = `${s.isTest ? "[TEST] " : ""}[CSC] 新提交｜${formTitle}｜${name}`;

  const textLines = [
    ...meta.map(([k, v]) => `${k}: ${v}`),
    "",
    "主要標籤:",
    ...(tags.length ? tags.map(([k, v]) => `- ${k}: ${v}`) : ["（無）"]),
    "",
    adminUrl ? `Admin: ${adminUrl}` : "Admin 連結未設定（settings.admin_base_url）",
    "",
    "此通知不包含長答內容，請在 Admin 內閱讀完整資料。",
  ];

  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const row = ([k, v]: [string, string]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#222">
<h2 style="font-size:16px;margin:0 0 12px">新提交｜${esc(formTitle)}</h2>
<table style="border-collapse:collapse">${meta.map(row).join("")}</table>
<h3 style="font-size:14px;margin:16px 0 6px">主要標籤</h3>
${tags.length ? `<table style="border-collapse:collapse">${tags.map(row).join("")}</table>` : "<p>（無）</p>"}
<p style="margin-top:16px">${adminUrl ? `<a href="${esc(adminUrl)}" style="background:#1f1a17;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">在 Admin 查看</a>` : "Admin 連結未設定（settings.admin_base_url）"}</p>
<p style="color:#888;font-size:12px">此通知不包含長答內容，請在 Admin 內閱讀完整資料。</p>
</body></html>`;

  return { subject, text: textLines.join("\n"), html };
}
