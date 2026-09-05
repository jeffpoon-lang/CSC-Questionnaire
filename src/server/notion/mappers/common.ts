import type { Question } from "@/engine/types";
import type { Submission } from "@/db/schema";

export type NotionProps = Record<string, unknown>;

export function optionLabel(questions: Question[], qid: string, value: unknown): string | null {
  const q = questions.find((x) => x.id === qid);
  if (!q || value === undefined || value === null || value === "") return null;
  if (q.type === "single_select" || q.type === "multi_select") {
    const opts = q.options ?? [];
    // optionsFrom: fall back to the source question's options
    const srcOpts = q.optionsFrom ? (questions.find((x) => x.id === q.optionsFrom?.questionId) as { options?: { value: string; label: string }[] } | undefined)?.options ?? [] : [];
    const all = [...opts, ...srcOpts, ...(q.optionsFrom?.append ?? [])];
    return all.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

export function optionLabels(questions: Question[], qid: string, value: unknown): string[] {
  if (!Array.isArray(value)) {
    const l = optionLabel(questions, qid, value);
    return l ? [l] : [];
  }
  return value.map((v) => optionLabel(questions, qid, v)).filter((x): x is string => Boolean(x));
}

const cleanSelect = (s: string) => s.replace(/,/g, "，").slice(0, 100);

export const P = {
  title: (s: string) => ({ title: [{ text: { content: s.slice(0, 2000) } }] }),
  text: (s: string | null | undefined) => ({ rich_text: s ? [{ text: { content: s.slice(0, 2000) } }] : [] }),
  select: (s: string | null | undefined) => (s ? { select: { name: cleanSelect(s) } } : { select: null }),
  multi: (arr: string[]) => ({ multi_select: arr.map((s) => ({ name: cleanSelect(s) })) }),
  email: (s: string | null | undefined) => ({ email: s || null }),
  phone: (s: string | null | undefined) => ({ phone_number: s || null }),
  url: (s: string | null | undefined) => ({ url: s || null }),
  date: (d: Date) => ({ date: { start: d.toISOString() } }),
  number: (n: number | null) => ({ number: n }),
  checkbox: (b: boolean) => ({ checkbox: b }),
};

export const STATUS_LABEL: Record<string, string> = {
  new: "新提交",
  reviewing: "審閱中",
  contacted: "已聯絡",
  qualified: "合適",
  closed: "已結束",
  spam: "垃圾",
};

export function commonProps(s: Submission, adminUrl: string | null): NotionProps {
  return {
    "提交日期": P.date(new Date(s.submittedAt)),
    "跟進狀態": P.select(STATUS_LABEL[s.internalStatus] ?? s.internalStatus),
    "表單版本": P.text(`v${s.formVersion}`),
    "Lead ID": P.text(s.leadId),
    "Submission ID": P.text(s.id),
    "來源": P.select(s.source ?? s.utmSource ?? null),
    "UTM": P.text([s.utmSource, s.utmMedium, s.utmCampaign].filter(Boolean).join(" / ") || null),
    "Admin": P.url(adminUrl),
    "TEST": P.checkbox(s.isTest),
  };
}
