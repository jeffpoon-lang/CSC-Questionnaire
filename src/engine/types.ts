/**
 * Form definition types.
 *
 * This module is PURE (no Cloudflare / Next dependencies) so it can be
 * unit-tested and shared between the browser renderer and the server
 * validator.
 *
 * Question IDs are immutable across versions (see publish-rules.ts).
 */

export type FormSlug = "generic_csc" | "high_ticket" | "community";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "url"
  | "single_select"
  | "multi_select"
  | "scale"
  | "consent";

export interface Option {
  value: string;
  label: string;
  /** Selecting this option clears all others (multi_select only). */
  exclusive?: boolean;
}

/**
 * Dynamic options: use the *selected* values of another (earlier) question
 * as the option list. Used by G09 ("which of the pains you picked in G08").
 */
export interface OptionsFromRule {
  questionId: string;
  /** Extra static options appended after the dynamic ones (e.g. 其他). */
  append?: Option[];
  /** What to do when the source question has no selection. Default: hide. */
  emptyBehavior?: "hide" | "show_append_only";
}

export type Condition =
  | { questionId: string; op: "eq" | "neq"; value: string | number | boolean }
  | { questionId: string; op: "in" | "notIn"; value: Array<string | number> }
  | { questionId: string; op: "includes" | "notIncludes"; value: string }
  | { questionId: string; op: "gte" | "lte"; value: number }
  | { questionId: string; op: "empty" | "notEmpty" }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface ConsentItem {
  /** "application" and "marketing" map to submission consent columns. */
  key: string;
  label: string;
  required: boolean;
  /** Initial checkbox state. Marketing consent must default to false. */
  default: boolean;
  /** Optional link shown next to the label (e.g. privacy statement). */
  link?: { label: string; href: string };
}

interface QuestionBase {
  id: string;
  type: QuestionType;
  label: string;
  hint?: string;
  required: boolean;
  /** Question is rendered + validated only when this condition holds. */
  visibleIf?: Condition;
  /** Pre-fill from a URL query parameter of this name (e.g. "src"). */
  prefillFromQuery?: string;
  /** Index select values into submission_tags for admin filtering. */
  tag?: boolean;
  /**
   * Never include in email summaries / Notion sync.
   * Defaults to true for long_text (see isSensitive()).
   */
  sensitive?: boolean;
  /** Optional visual grouping label. */
  section?: string;
}

export type ShortTextQuestion = QuestionBase & {
  type: "short_text";
  maxLength?: number;
  placeholder?: string;
};
export type LongTextQuestion = QuestionBase & {
  type: "long_text";
  maxLength?: number;
  /** Show the "do not enter third-party personal data" reminder. */
  piiHint?: boolean;
  placeholder?: string;
  rows?: number;
};
export type EmailQuestion = QuestionBase & { type: "email" };
export type PhoneQuestion = QuestionBase & {
  type: "phone";
  /** ISO 3166-1 alpha-2, e.g. "HK". */
  defaultCountry: string;
};
export type UrlQuestion = QuestionBase & { type: "url" };
export type SingleSelectQuestion = QuestionBase & {
  type: "single_select";
  options?: Option[];
  optionsFrom?: OptionsFromRule;
  layout?: "radio" | "dropdown";
};
export type MultiSelectQuestion = QuestionBase & {
  type: "multi_select";
  options?: Option[];
  optionsFrom?: OptionsFromRule;
  minSelections?: number;
  maxSelections?: number;
};
export type ScaleQuestion = QuestionBase & {
  type: "scale";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
};
export type ConsentQuestion = QuestionBase & {
  type: "consent";
  items: ConsentItem[];
};

export type Question =
  | ShortTextQuestion
  | LongTextQuestion
  | EmailQuestion
  | PhoneQuestion
  | UrlQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | ScaleQuestion
  | ConsentQuestion;

export type SelectQuestion = SingleSelectQuestion | MultiSelectQuestion;

/** A CTA target: a literal URL or a key in the settings table. */
export type CtaHref = string | { setting: string };

export interface Cta {
  label: string;
  href: CtaHref;
  style?: "primary" | "secondary";
}

export interface SuccessConfig {
  headline: string;
  body?: string;
  /** Omitted for high_ticket: message only, no CTA. */
  primaryCta?: Cta;
  secondary?: Array<{ when: Condition; cta: Cta }>;
  notes?: Array<{ when: Condition; text: string }>;
}

export interface FormSettings {
  honeypot: boolean;
  turnstile: boolean;
  duplicateWindowDays?: number;
  /** Override for the default PII reminder text on long_text questions. */
  piiHintText?: string;
  /** Approximate time to complete, shown in the intro. */
  estimatedMinutes?: string;
}

export interface FormDefinition {
  schemaVersion: 1;
  slug: FormSlug;
  title: string;
  intro?: string;
  submitLabel?: string;
  questions: Question[];
  success: SuccessConfig;
  settings: FormSettings;
}

export interface ModuleDefinition {
  schemaVersion: 1;
  slug: string;
  title: string;
  intro?: string;
  /** Question ids must start with `M_${slug}_`. */
  questions: Question[];
}

/** Consent answers are stored as { [itemKey]: boolean }. */
export type ConsentAnswer = Record<string, boolean>;

export type AnswerValue = string | number | string[] | ConsentAnswer | null | undefined;

export type Answers = Record<string, AnswerValue>;

export const DEFAULT_PII_HINT =
  "請勿在此填寫員工、病人、客戶或其他第三方的不必要個人資料。";

export function isSensitive(q: Question): boolean {
  if (typeof q.sensitive === "boolean") return q.sensitive;
  return q.type === "long_text";
}

export function isSelect(q: Question): q is SelectQuestion {
  return q.type === "single_select" || q.type === "multi_select";
}
