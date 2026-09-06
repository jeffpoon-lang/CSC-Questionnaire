import type { Answers, AnswerValue, Condition } from "./types";

function isEmptyValue(v: AnswerValue): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

/**
 * Evaluate a visibility / success-page condition against the current answers.
 * Unknown question ids evaluate to false (never throws).
 */
export function evaluateCondition(cond: Condition, answers: Answers): boolean {
  if ("all" in cond) return cond.all.every((c) => evaluateCondition(c, answers));
  if ("any" in cond) return cond.any.some((c) => evaluateCondition(c, answers));
  if ("not" in cond) return !evaluateCondition(cond.not, answers);

  const v = answers[cond.questionId];
  switch (cond.op) {
    case "empty":
      return isEmptyValue(v);
    case "notEmpty":
      return !isEmptyValue(v);
    case "eq":
      return v === cond.value || (typeof v === "number" && String(v) === String(cond.value));
    case "neq":
      return !(v === cond.value || (typeof v === "number" && String(v) === String(cond.value)));
    case "in":
      return v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object"
        ? cond.value.some((x) => x === v || String(x) === String(v))
        : false;
    case "notIn":
      return v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object"
        ? !cond.value.some((x) => x === v || String(x) === String(v))
        : true;
    case "includes":
      return Array.isArray(v) ? v.includes(cond.value) : v === cond.value;
    case "notIncludes":
      return Array.isArray(v) ? !v.includes(cond.value) : v !== cond.value;
    case "gte":
      return typeof v === "number" ? v >= cond.value : false;
    case "lte":
      return typeof v === "number" ? v <= cond.value : false;
    default:
      return false;
  }
}

/** All question ids referenced by a condition (for publish-rule checks). */
export function referencedQuestionIds(cond: Condition): string[] {
  if ("all" in cond) return cond.all.flatMap(referencedQuestionIds);
  if ("any" in cond) return cond.any.flatMap(referencedQuestionIds);
  if ("not" in cond) return referencedQuestionIds(cond.not);
  return [cond.questionId];
}
