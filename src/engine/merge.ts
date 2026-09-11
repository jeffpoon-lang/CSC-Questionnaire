import type { FormDefinition, ModuleDefinition, Question } from "./types";

export const MODULE_ID_PREFIX = "M_";

export function moduleQuestionPrefix(moduleSlug: string): string {
  return `${MODULE_ID_PREFIX}${moduleSlug}_`;
}

/**
 * Core questions first, then each module's questions in the given order.
 * Modules are placed BEFORE the trailing consent block of the core form so
 * that consent stays last.
 */
export function mergeQuestions(def: FormDefinition, modules: ModuleDefinition[]): Question[] {
  if (modules.length === 0) return def.questions;
  const core = def.questions;
  // trailing consent questions (plus anything after the first consent)
  let splitAt = core.findIndex((q) => q.type === "consent");
  if (splitAt === -1) splitAt = core.length;
  const head = core.slice(0, splitAt);
  const tail = core.slice(splitAt);
  // The renderer pages by section, so a module's questions carry the module
  // title as their section instead of inheriting the core form's last one.
  const moduleQs = modules.flatMap((m) =>
    m.questions.map((q) => (q.section ? q : { ...q, section: m.title })),
  );
  return [...head, ...moduleQs, ...tail];
}
