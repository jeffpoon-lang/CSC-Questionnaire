import type { Answers, Option, Question, SelectQuestion } from "./types";
import { isSelect } from "./types";

/**
 * Resolve the option list of a select question, taking `optionsFrom`
 * (dynamic options derived from an earlier question's selection) into account.
 *
 * Returns `null` when the question should be hidden because its dynamic
 * source is empty and emptyBehavior is "hide".
 */
export function resolveOptions(
  q: SelectQuestion,
  answers: Answers,
  allQuestions: Question[],
): Option[] | null {
  if (!q.optionsFrom) return q.options ?? [];

  const rule = q.optionsFrom;
  const source = allQuestions.find((x) => x.id === rule.questionId);
  const sourceOptions: Option[] = source && isSelect(source) ? (source.options ?? []) : [];

  const raw = answers[rule.questionId];
  const selected: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw !== ""
      ? [raw]
      : [];

  const dynamic: Option[] = selected
    .map((v) => sourceOptions.find((o) => o.value === v) ?? { value: v, label: v })
    .filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

  if (dynamic.length === 0 && (rule.emptyBehavior ?? "hide") === "hide") return null;

  const appended = (rule.append ?? []).filter((a) => !dynamic.some((d) => d.value === a.value));
  return [...dynamic, ...appended];
}
