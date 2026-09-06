import { evaluateCondition } from "./conditions";
import { resolveOptions } from "./options";
import type { Answers, Question } from "./types";
import { isSelect } from "./types";

/**
 * Compute which questions are visible given the current answers.
 * Evaluated in order, so a question can only depend on earlier ones.
 * Answers of hidden questions are ignored when evaluating later conditions.
 */
export function visibleQuestions(questions: Question[], answers: Answers): Question[] {
  const visible: Question[] = [];
  const effective: Answers = {};

  for (const q of questions) {
    let show = true;
    if (q.visibleIf && !evaluateCondition(q.visibleIf, effective)) show = false;
    if (show && isSelect(q) && q.optionsFrom) {
      const opts = resolveOptions(q, effective, questions);
      if (opts === null) show = false;
    }
    if (show) {
      visible.push(q);
      effective[q.id] = answers[q.id];
    }
  }
  return visible;
}

/** Keep only answers of visible questions (server + client use this before validation). */
export function stripHiddenAnswers(questions: Question[], answers: Answers): Answers {
  const visible = visibleQuestions(questions, answers);
  const out: Answers = {};
  for (const q of visible) {
    if (q.id in answers) out[q.id] = answers[q.id];
  }
  return out;
}
