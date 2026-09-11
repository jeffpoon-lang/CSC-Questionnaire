import type { Question } from "@/engine/types";

/**
 * Split a form into pages of a few questions each.
 *
 * Two rules, in order:
 *  1. A page never crosses a `section` boundary (questions without a section
 *     belong to the last declared one), so the progress bar can name where
 *     the respondent is.
 *  2. Within a section, questions fill a page up to PAGE_WEIGHT. A long_text
 *     counts double, which keeps two essay boxes off the same screen.
 */
export const PAGE_WEIGHT = 3;

export interface FormPage {
  questions: Question[];
  /** Inherited section label; "" when the form declares no sections. */
  section: string;
}

export function questionWeight(q: Question): number {
  return q.type === "long_text" ? 2 : 1;
}

/** Section label each question belongs to, inheriting the last declared one. */
export function sectionOf(questions: Question[]): Map<string, string> {
  const map = new Map<string, string>();
  let current = "";
  for (const q of questions) {
    if (q.section) current = q.section;
    map.set(q.id, current);
  }
  return map;
}

/** Pass the *visible* questions (see engine/visibility). */
export function paginate(questions: Question[]): FormPage[] {
  const sections = sectionOf(questions);
  const pages: FormPage[] = [];
  let current: Question[] = [];
  let section = "";
  let load = 0;

  for (const q of questions) {
    const qSection = sections.get(q.id) ?? "";
    const w = questionWeight(q);
    if (current.length > 0 && (qSection !== section || load + w > PAGE_WEIGHT)) {
      pages.push({ questions: current, section });
      current = [];
      load = 0;
    }
    current.push(q);
    section = qSection;
    load += w;
  }
  if (current.length > 0) pages.push({ questions: current, section });
  return pages;
}

/** Ordered, de-duplicated section labels; empty when the form has no sections. */
export function sectionList(pages: FormPage[]): string[] {
  const out: string[] = [];
  for (const p of pages) {
    if (p.section && !out.includes(p.section)) out.push(p.section);
  }
  return out;
}

/** Index of the page holding a question, or -1. */
export function pageOfQuestion(pages: FormPage[], questionId: string): number {
  return pages.findIndex((p) => p.questions.some((q) => q.id === questionId));
}
