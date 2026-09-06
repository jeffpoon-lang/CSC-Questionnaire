import type { Question } from "@/engine/types";
import type { Submission } from "@/db/schema";

const esc = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_META_COLUMNS: Array<[string, (s: Submission) => unknown]> = [
  ["submission_id", (s) => s.id],
  ["lead_id", (s) => s.leadId],
  ["form_type", (s) => s.formSlug],
  ["form_version", (s) => s.formVersion],
  ["module_ids", (s) => s.moduleIds],
  ["module_versions", (s) => s.moduleVersions.map((m) => `${m.slug}@v${m.version}`)],
  ["entry_mode", (s) => s.entryMode],
  ["created_at", (s) => s.createdAt.toISOString()],
  ["submitted_at", (s) => s.submittedAt.toISOString()],
  ["display_name", (s) => s.displayName],
  ["email", (s) => s.email],
  ["phone_e164", (s) => s.phoneE164],
  ["source", (s) => s.source],
  ["utm_source", (s) => s.utmSource],
  ["utm_medium", (s) => s.utmMedium],
  ["utm_campaign", (s) => s.utmCampaign],
  ["utm_term", (s) => s.utmTerm],
  ["utm_content", (s) => s.utmContent],
  ["landing_page", (s) => s.landingPage],
  ["cta", (s) => s.cta],
  ["referrer", (s) => s.referrer],
  ["consent_application", (s) => (s.consentApplication ? "yes" : "no")],
  ["consent_marketing", (s) => (s.consentMarketing ? "yes" : "no")],
  ["internal_status", (s) => s.internalStatus],
  ["review_owner", (s) => s.reviewOwner],
  ["duplicate_of", (s) => s.duplicateOf],
  ["notion_sync_status", (s) => s.notionSyncStatus],
  ["notion_page_id", (s) => s.notionPageId],
  ["is_test", (s) => (s.isTest ? "yes" : "no")],
];

export function csvHeader(questions: Question[]): string {
  return [...CSV_META_COLUMNS.map(([k]) => k), ...questions.map((q) => `${q.id} ${q.label}`)].map(esc).join(",") + "\n";
}

export function csvRow(s: Submission, questions: Question[]): string {
  const meta = CSV_META_COLUMNS.map(([, fn]) => fn(s));
  const answers = questions.map((q) => {
    const v = s.answersJson[q.id];
    if (q.type === "consent" && v && typeof v === "object" && !Array.isArray(v)) {
      return Object.entries(v).filter(([, b]) => b).map(([k]) => k).join("; ");
    }
    return v;
  });
  return [...meta, ...answers].map(esc).join(",") + "\n";
}
