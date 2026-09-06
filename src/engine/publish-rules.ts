import type { DefinitionIssue } from "./definition-schema";
import type { Question } from "./types";

/**
 * Question-ID immutability across versions.
 *
 * - An id used in ANY prior version must keep its `type`.
 * - Ids may be removed; a removed id may come back only with the same type.
 * - Changing a label is allowed (warning only) — historical submissions keep
 *   their own snapshot via form_version_id.
 * - Module ids must not collide with core ids (checked by the caller with `reservedIds`).
 */
export function checkPublishRules(
  next: Question[],
  priorVersions: Question[][],
  reservedIds: Set<string> = new Set(),
): { errors: DefinitionIssue[]; warnings: DefinitionIssue[] } {
  const errors: DefinitionIssue[] = [];
  const warnings: DefinitionIssue[] = [];

  const priorById = new Map<string, Question>();
  for (const version of priorVersions) {
    for (const q of version) if (!priorById.has(q.id)) priorById.set(q.id, q);
  }

  for (const q of next) {
    const prior = priorById.get(q.id);
    if (prior) {
      if (prior.type !== q.type) {
        errors.push({ path: q.id, message: `題目 ${q.id} 曾以 ${prior.type} 類型發布，不可改為 ${q.type}；請改用新 ID` });
      } else if (prior.label !== q.label) {
        warnings.push({ path: q.id, message: `題目 ${q.id} 的文字已改變；舊提交仍會以舊版本顯示` });
      }
    }
    if (reservedIds.has(q.id)) errors.push({ path: q.id, message: `題目 ID ${q.id} 與其他表單／模組衝突` });
  }
  return { errors, warnings };
}
