import { z } from "zod";
import type { FormDefinition, ModuleDefinition } from "./types";
import { referencedQuestionIds } from "./conditions";
import { moduleQuestionPrefix } from "./merge";

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  exclusive: z.boolean().optional(),
});

const conditionSchema: z.ZodType<import("./types").Condition> = z.lazy(() =>
  z.union([
    z.object({ questionId: z.string().min(1), op: z.enum(["eq", "neq"]), value: z.union([z.string(), z.number(), z.boolean()]) }),
    z.object({ questionId: z.string().min(1), op: z.enum(["in", "notIn"]), value: z.array(z.union([z.string(), z.number()])) }),
    z.object({ questionId: z.string().min(1), op: z.enum(["includes", "notIncludes"]), value: z.string() }),
    z.object({ questionId: z.string().min(1), op: z.enum(["gte", "lte"]), value: z.number() }),
    z.object({ questionId: z.string().min(1), op: z.enum(["empty", "notEmpty"]) }),
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
  ]),
);

const optionsFromSchema = z.object({
  questionId: z.string().min(1),
  append: z.array(optionSchema).optional(),
  emptyBehavior: z.enum(["hide", "show_append_only"]).optional(),
});

const base = {
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "id 只可以包含英數字及底線"),
  label: z.string().min(1),
  hint: z.string().optional(),
  required: z.boolean(),
  visibleIf: conditionSchema.optional(),
  prefillFromQuery: z.string().optional(),
  tag: z.boolean().optional(),
  sensitive: z.boolean().optional(),
  section: z.string().optional(),
};

const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("short_text"), maxLength: z.number().int().positive().optional(), placeholder: z.string().optional() }),
  z.object({ ...base, type: z.literal("long_text"), maxLength: z.number().int().positive().max(5000).optional(), piiHint: z.boolean().optional(), placeholder: z.string().optional(), rows: z.number().int().positive().optional() }),
  z.object({ ...base, type: z.literal("email") }),
  z.object({ ...base, type: z.literal("phone"), defaultCountry: z.string().length(2) }),
  z.object({ ...base, type: z.literal("url") }),
  z.object({ ...base, type: z.literal("single_select"), options: z.array(optionSchema).optional(), optionsFrom: optionsFromSchema.optional(), layout: z.enum(["radio", "dropdown"]).optional() }),
  z.object({ ...base, type: z.literal("multi_select"), options: z.array(optionSchema).optional(), optionsFrom: optionsFromSchema.optional(), minSelections: z.number().int().nonnegative().optional(), maxSelections: z.number().int().positive().optional() }),
  z.object({ ...base, type: z.literal("scale"), min: z.number().int(), max: z.number().int(), minLabel: z.string().optional(), maxLabel: z.string().optional() }),
  z.object({
    ...base,
    type: z.literal("consent"),
    items: z.array(z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean(),
      default: z.boolean(),
      link: z.object({ label: z.string(), href: z.string() }).optional(),
    })).min(1),
  }),
]);

const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.union([z.string().min(1), z.object({ setting: z.string().min(1) })]),
  style: z.enum(["primary", "secondary"]).optional(),
});

const successSchema = z.object({
  headline: z.string().min(1),
  body: z.string().optional(),
  primaryCta: ctaSchema.optional(),
  secondary: z.array(z.object({ when: conditionSchema, cta: ctaSchema })).optional(),
  notes: z.array(z.object({ when: conditionSchema, text: z.string().min(1) })).optional(),
});

export const formDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.enum(["generic_csc", "high_ticket", "community"]),
  title: z.string().min(1),
  intro: z.string().optional(),
  submitLabel: z.string().optional(),
  questions: z.array(questionSchema).min(1),
  success: successSchema,
  settings: z.object({
    honeypot: z.boolean(),
    turnstile: z.boolean(),
    duplicateWindowDays: z.number().int().nonnegative().optional(),
    piiHintText: z.string().optional(),
    estimatedMinutes: z.string().optional(),
  }),
});

export const moduleDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z][a-z0-9_]*$/, "slug 只可以用小寫英數字及底線"),
  title: z.string().min(1),
  intro: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

export interface DefinitionIssue {
  path: string;
  message: string;
}

/**
 * Structural checks beyond the zod shape: unique ids, forward-only references,
 * select questions have options, consent defaults, marketing default false.
 */
export function lintQuestions(questions: FormDefinition["questions"], idPrefix?: string): DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];
  const seen = new Set<string>();
  questions.forEach((q, idx) => {
    const path = `questions[${idx}] (${q.id})`;
    if (seen.has(q.id)) issues.push({ path, message: `題目 ID 重複：${q.id}` });
    seen.add(q.id);
    if (idPrefix && !q.id.startsWith(idPrefix)) issues.push({ path, message: `模組題目 ID 必須以 ${idPrefix} 開頭` });

    const earlier = new Set(questions.slice(0, idx).map((x) => x.id));
    if (q.visibleIf) {
      for (const ref of referencedQuestionIds(q.visibleIf)) {
        if (!earlier.has(ref)) issues.push({ path, message: `visibleIf 只可以引用前面的題目（${ref}）` });
      }
    }
    if (q.type === "single_select" || q.type === "multi_select") {
      if (q.optionsFrom) {
        if (!earlier.has(q.optionsFrom.questionId)) issues.push({ path, message: `optionsFrom 只可以引用前面的題目（${q.optionsFrom.questionId}）` });
        const src = questions.find((x) => x.id === q.optionsFrom?.questionId);
        if (src && src.type !== "single_select" && src.type !== "multi_select") issues.push({ path, message: "optionsFrom 來源必須是選擇題" });
      } else if (!q.options || q.options.length === 0) {
        issues.push({ path, message: "選擇題必須有選項或 optionsFrom" });
      }
      if (q.type === "multi_select" && q.maxSelections !== undefined && q.minSelections !== undefined && q.minSelections > q.maxSelections) {
        issues.push({ path, message: "minSelections 不可以大於 maxSelections" });
      }
      const vals = (q.options ?? []).map((o) => o.value);
      if (new Set(vals).size !== vals.length) issues.push({ path, message: "選項 value 重複" });
    }
    if (q.type === "scale" && q.min >= q.max) issues.push({ path, message: "scale min 必須小於 max" });
    if (q.type === "consent") {
      const keys = q.items.map((i) => i.key);
      if (new Set(keys).size !== keys.length) issues.push({ path, message: "consent item key 重複" });
      for (const item of q.items) {
        if (item.key === "marketing" && item.default) issues.push({ path, message: "推廣同意預設必須不勾選" });
        if (item.key === "marketing" && item.required) issues.push({ path, message: "推廣同意不可以設為必填" });
      }
    }
  });
  return issues;
}

export function lintSuccess(def: FormDefinition): DefinitionIssue[] {
  const ids = new Set(def.questions.map((q) => q.id));
  const issues: DefinitionIssue[] = [];
  const check = (cond: import("./types").Condition, path: string) => {
    for (const ref of referencedQuestionIds(cond)) {
      if (!ids.has(ref)) issues.push({ path, message: `條件引用不存在的題目：${ref}` });
    }
  };
  (def.success.secondary ?? []).forEach((s, i) => check(s.when, `success.secondary[${i}]`));
  (def.success.notes ?? []).forEach((n, i) => check(n.when, `success.notes[${i}]`));
  return issues;
}

export interface ParsedDefinition<T> {
  ok: boolean;
  value?: T;
  issues: DefinitionIssue[];
}

export function parseFormDefinition(input: unknown): ParsedDefinition<FormDefinition> {
  const r = formDefinitionSchema.safeParse(input);
  if (!r.success) {
    return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const def = r.data as FormDefinition;
  const issues = [...lintQuestions(def.questions), ...lintSuccess(def)];
  const hasApplicationConsent = def.questions.some(
    (q) => q.type === "consent" && q.items.some((i) => i.key === "application" && i.required),
  );
  if (!hasApplicationConsent) issues.push({ path: "questions", message: "必須有一題必填的「資料使用同意」（consent key=application）" });
  return { ok: issues.length === 0, value: def, issues };
}

export function parseModuleDefinition(input: unknown): ParsedDefinition<ModuleDefinition> {
  const r = moduleDefinitionSchema.safeParse(input);
  if (!r.success) {
    return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const def = r.data as ModuleDefinition;
  const issues = lintQuestions(def.questions, moduleQuestionPrefix(def.slug));
  if (def.questions.some((q) => q.type === "consent")) issues.push({ path: "questions", message: "模組不可以包含 consent 題目" });
  return { ok: issues.length === 0, value: def, issues };
}
