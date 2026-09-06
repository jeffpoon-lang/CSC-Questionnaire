import type { Answers, Question } from "./types";

export interface Tag {
  questionId: string;
  value: string;
}

/** Extract indexable tags (select answers of questions flagged `tag: true`). */
export function extractTags(questions: Question[], answers: Answers): Tag[] {
  const tags: Tag[] = [];
  for (const q of questions) {
    if (!q.tag) continue;
    const v = answers[q.id];
    if (typeof v === "string" && v !== "") tags.push({ questionId: q.id, value: v });
    else if (Array.isArray(v)) for (const x of v) tags.push({ questionId: q.id, value: x });
    else if (typeof v === "number") tags.push({ questionId: q.id, value: String(v) });
  }
  return tags;
}
