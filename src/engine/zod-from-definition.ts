import { z } from "zod";
import { resolveOptions } from "./options";
import { normalizeEmail, normalizePhone, normalizeText, normalizeUrl } from "./normalize";
import type { Answers, Question } from "./types";
import { visibleQuestions } from "./visibility";

export const DEFAULT_SHORT_TEXT_MAX = 200;
export const DEFAULT_LONG_TEXT_MAX = 5000;

const REQUIRED_MSG = "此題為必填";
const INVALID_OPTION_MSG = "請選擇有效選項";

function optionalString() {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v : ""));
}

function textSchema(q: Question & { type: "short_text" | "long_text" }) {
  const max = q.maxLength ?? (q.type === "short_text" ? DEFAULT_SHORT_TEXT_MAX : DEFAULT_LONG_TEXT_MAX);
  let s = optionalString().transform((v) => normalizeText(v, undefined));
  s = s.refine((v) => v.length <= max, { message: `最多 ${max} 字` }) as typeof s;
  if (q.required) return s.refine((v) => v.length > 0, { message: REQUIRED_MSG });
  return s;
}

function emailSchema(q: Question) {
  const s = optionalString().transform((v) => normalizeEmail(v));
  return s.superRefine((v, ctx) => {
    if (v === "") {
      if (q.required) ctx.addIssue({ code: "custom", message: REQUIRED_MSG });
      return;
    }
    if (!z.email().safeParse(v).success) ctx.addIssue({ code: "custom", message: "請輸入有效電郵" });
  });
}

function phoneSchema(q: Question & { type: "phone" }) {
  return optionalString().superRefine((v, ctx) => {
    if (v.trim() === "") {
      if (q.required) ctx.addIssue({ code: "custom", message: REQUIRED_MSG });
      return;
    }
    if (!normalizePhone(v, q.defaultCountry)) {
      ctx.addIssue({ code: "custom", message: "請輸入有效電話號碼（包括國家／地區碼）" });
    }
  }).transform((v) => (v.trim() === "" ? "" : (normalizePhone(v, q.defaultCountry) ?? v)));
}

function urlSchema(q: Question) {
  return optionalString().superRefine((v, ctx) => {
    if (v.trim() === "") {
      if (q.required) ctx.addIssue({ code: "custom", message: REQUIRED_MSG });
      return;
    }
    if (!normalizeUrl(v)) ctx.addIssue({ code: "custom", message: "請輸入有效連結" });
  }).transform((v) => (v.trim() === "" ? "" : (normalizeUrl(v) ?? v)));
}

function singleSelectSchema(q: Question & { type: "single_select" }, values: string[]) {
  return optionalString().superRefine((v, ctx) => {
    if (v === "") {
      if (q.required) ctx.addIssue({ code: "custom", message: REQUIRED_MSG });
      return;
    }
    if (!values.includes(v)) ctx.addIssue({ code: "custom", message: INVALID_OPTION_MSG });
  });
}

function multiSelectSchema(q: Question & { type: "multi_select" }, values: string[]) {
  return z
    .union([z.array(z.string()), z.null(), z.undefined()])
    .transform((v) => (Array.isArray(v) ? Array.from(new Set(v)) : []))
    .superRefine((v, ctx) => {
      if (v.some((x) => !values.includes(x))) {
        ctx.addIssue({ code: "custom", message: INVALID_OPTION_MSG });
        return;
      }
      const min = q.required ? Math.max(1, q.minSelections ?? 1) : (q.minSelections ?? 0);
      if (v.length < min) {
        ctx.addIssue({ code: "custom", message: min === 1 ? REQUIRED_MSG : `最少選擇 ${min} 項` });
      }
      if (typeof q.maxSelections === "number" && v.length > q.maxSelections) {
        ctx.addIssue({ code: "custom", message: `最多選擇 ${q.maxSelections} 項` });
      }
    });
}

function scaleSchema(q: Question & { type: "scale" }) {
  return z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
      return null;
    })
    .superRefine((v, ctx) => {
      if (v === null) {
        if (q.required) ctx.addIssue({ code: "custom", message: REQUIRED_MSG });
        return;
      }
      if (!Number.isInteger(v) || v < q.min || v > q.max) {
        ctx.addIssue({ code: "custom", message: `請選擇 ${q.min}–${q.max}` });
      }
    });
}

function consentSchema(q: Question & { type: "consent" }) {
  return z
    .union([z.record(z.string(), z.boolean()), z.null(), z.undefined()])
    .transform((v) => {
      const out: Record<string, boolean> = {};
      for (const item of q.items) out[item.key] = Boolean(v?.[item.key]);
      return out;
    })
    .superRefine((v, ctx) => {
      for (const item of q.items) {
        if (item.required && !v[item.key]) {
          ctx.addIssue({ code: "custom", message: "請勾選以繼續" });
          return;
        }
      }
    });
}

function schemaFor(q: Question, answers: Answers, all: Question[]) {
  switch (q.type) {
    case "short_text":
    case "long_text":
      return textSchema(q);
    case "email":
      return emailSchema(q);
    case "phone":
      return phoneSchema(q);
    case "url":
      return urlSchema(q);
    case "single_select": {
      const opts = resolveOptions(q, answers, all) ?? [];
      return singleSelectSchema(q, opts.map((o) => o.value));
    }
    case "multi_select": {
      const opts = resolveOptions(q, answers, all) ?? [];
      return multiSelectSchema(q, opts.map((o) => o.value));
    }
    case "scale":
      return scaleSchema(q);
    case "consent":
      return consentSchema(q);
  }
}

/**
 * Build a zod object schema for the *visible* questions given the current
 * answers. Hidden questions are omitted entirely (and stripped on parse).
 *
 * Runs identically in the browser (react-hook-form resolver) and on the server.
 */
export function buildAnswerSchema(questions: Question[], answers: Answers) {
  const visible = visibleQuestions(questions, answers);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of visible) shape[q.id] = schemaFor(q, answers, questions);
  const keys = visible.map((q) => q.id);
  // Fill missing keys with null so zod 4's object optionality check never
  // sees `undefined`; every field schema accepts null and normalizes it.
  return z.preprocess((input) => {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = src[k] === undefined ? null : src[k];
    return out;
  }, z.object(shape).strip());
}

export type FieldErrors = Record<string, string>;

export interface ValidationResult {
  ok: boolean;
  data: Answers;
  errors: FieldErrors;
}

/** Validate + normalize; returns per-question error messages. */
export function validateAnswers(questions: Question[], answers: Answers): ValidationResult {
  const schema = buildAnswerSchema(questions, answers);
  const result = schema.safeParse(answers);
  if (result.success) return { ok: true, data: result.data as Answers, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, data: {}, errors };
}
