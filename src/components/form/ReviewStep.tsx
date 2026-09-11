"use client";

import { useMemo } from "react";
import { resolveOptions } from "@/engine/options";
import type { Answers, Question } from "@/engine/types";
import { isSelect } from "@/engine/types";
import { sectionOf } from "./pagination";

/** Human-readable answer for the review list. "" when unanswered. */
export function formatAnswer(q: Question, answers: Answers, all: Question[]): string {
  const v = answers[q.id];
  if (q.type === "consent") {
    const picked = q.items.filter((item) => Boolean((v as Record<string, boolean> | undefined)?.[item.key]));
    return picked.map((item) => `已同意：${item.label}`).join("\n");
  }
  if (q.type === "scale") return typeof v === "number" ? `${v} ／ ${q.max}` : "";
  if (isSelect(q)) {
    const options = resolveOptions(q, answers, all) ?? [];
    const labelOf = (x: string) => options.find((o) => o.value === x)?.label ?? x;
    if (q.type === "multi_select") return (Array.isArray(v) ? v : []).map(labelOf).join("、");
    return typeof v === "string" && v !== "" ? labelOf(v) : "";
  }
  return typeof v === "string" ? v : "";
}

export function ReviewStep(props: {
  questions: Question[];
  allQuestions: Question[];
  answers: Answers;
  errors: Record<string, string>;
  onEdit: (questionId: string) => void;
}) {
  const rows = useMemo(() => {
    const sections = sectionOf(props.questions);
    const out: Array<{ q: Question; heading: string | null }> = [];
    let last = "";
    for (const q of props.questions) {
      const section = sections.get(q.id) ?? "";
      const heading = section && section !== last ? section : null;
      if (heading) last = section;
      out.push({ q, heading });
    }
    return out;
  }, [props.questions]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900">檢視你的答案</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        提交前可以返回任何一題修改。提交後不能自行更改。
      </p>
      <dl className="mt-5">
        {rows.map(({ q, heading }) => {
          const text = formatAnswer(q, props.answers, props.allQuestions);
          const error = props.errors[q.id];
          return (
            <div key={q.id} className="contents">
              {heading && (
                <p className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{heading}</p>
              )}
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-stone-200 py-3">
                <dt className="col-span-2 text-sm text-stone-500">{q.label}</dt>
                <dd className={`whitespace-pre-line text-base ${text ? "text-stone-900" : "italic text-stone-400"}`}>
                  {text || (q.required ? "未填寫" : "略過")}
                </dd>
                <button
                  type="button"
                  onClick={() => props.onEdit(q.id)}
                  className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                >
                  修改
                  <span className="sr-only">：{q.label}</span>
                </button>
                {error && (
                  <p className="col-span-2 mt-1 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
