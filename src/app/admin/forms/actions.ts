"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { formVersions, forms } from "@/db/schema";
import { allModuleQuestionIds, getFormBySlug, listFormVersions } from "@/db/queries/forms";
import { parseFormDefinition } from "@/engine/definition-schema";
import { checkPublishRules } from "@/engine/publish-rules";
import { requireAdmin } from "@/server/auth/require-admin";
import { newId } from "@/server/ids";
import type { EditorState } from "@/components/admin/DefinitionEditor";

export async function toggleFormStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!slug || (status !== "enabled" && status !== "disabled")) return;
  const db = await getDb();
  await db.update(forms).set({ status, updatedAt: new Date() }).where(eq(forms.slug, slug));
  revalidatePath("/admin/forms");
}

export async function setFormAccessAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const access = String(formData.get("access") ?? "");
  if (!slug || (access !== "public" && access !== "invite_only")) return;
  const db = await getDb();
  await db.update(forms).set({ access, updatedAt: new Date() }).where(eq(forms.slug, slug));
  revalidatePath("/admin/forms");
}

/** Create a new draft version copied from the current published version. */
export async function createDraftAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const db = await getDb();
  const form = await getFormBySlug(db, slug);
  if (!form) return;
  const versions = await listFormVersions(db, form.id);
  if (versions.some((v) => v.status === "draft")) { revalidatePath(`/admin/forms/${slug}`); return; }
  const base = versions.find((v) => v.id === form.currentVersionId) ?? versions[0];
  if (!base) return;
  const [{ m }] = await db.select({ m: max(formVersions.version) }).from(formVersions).where(eq(formVersions.formId, form.id));
  await db.insert(formVersions).values({ id: newId(), formId: form.id, version: (m ?? 0) + 1, status: "draft", definitionJson: base.definitionJson, changeNote: null, createdBy: user.email, createdAt: new Date() });
  revalidatePath(`/admin/forms/${slug}`);
}

export async function saveFormDraftAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const user = await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const changeNote = String(formData.get("changeNote") ?? "").trim();
  const raw = String(formData.get("json") ?? "");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (e) {
    return { ok: false, message: `JSON 無法解析：${e instanceof Error ? e.message : ""}` };
  }
  const db = await getDb();
  const form = await getFormBySlug(db, slug);
  if (!form) return { ok: false, message: "表單不存在" };
  const [draft] = await db.select().from(formVersions).where(eq(formVersions.id, versionId)).limit(1);
  if (!draft || draft.formId !== form.id || draft.status !== "draft") return { ok: false, message: "只可以編輯草稿版本" };

  const parsed = parseFormDefinition(parsedJson);
  if (parsed.value && parsed.value.slug !== slug) parsed.issues.push({ path: "slug", message: `slug 必須是 ${slug}` });
  const structurallyOk = parsed.issues.length === 0 && parsed.value;

  // Save draft text even when invalid (so work isn't lost), but only as parsed JSON.
  await db.update(formVersions).set({ definitionJson: parsedJson as never, changeNote: changeNote || draft.changeNote, createdBy: user.email }).where(eq(formVersions.id, versionId));

  if (!structurallyOk) return { ok: false, message: "草稿已儲存，但定義有問題，未能發布：", issues: parsed.issues };

  const priors = (await listFormVersions(db, form.id)).filter((v) => v.id !== versionId && v.status !== "draft").map((v) => v.definitionJson.questions);
  const reserved = await allModuleQuestionIds(db);
  const rules = checkPublishRules(parsed.value!.questions, priors, reserved);
  if (rules.errors.length) return { ok: false, message: "草稿已儲存，但違反版本規則，未能發布：", issues: rules.errors, warnings: rules.warnings };

  if (intent !== "publish") {
    revalidatePath(`/admin/forms/${slug}`);
    return { ok: true, message: "草稿已儲存並通過驗證。", warnings: rules.warnings, savedVersionId: versionId };
  }

  const now = new Date();
  await db.batch([
    db.update(formVersions).set({ status: "archived" }).where(and(eq(formVersions.formId, form.id), eq(formVersions.status, "published"))),
    db.update(formVersions).set({ status: "published", publishedAt: now, definitionJson: parsed.value! }).where(eq(formVersions.id, versionId)),
    db.update(forms).set({ currentVersionId: versionId, title: parsed.value!.title, updatedAt: now }).where(eq(forms.id, form.id)),
  ]);
  revalidatePath(`/admin/forms/${slug}`);
  revalidatePath("/admin/forms");
  return { ok: true, message: `已發布 v${draft.version}。新提交會使用此版本；舊提交保留原版本。`, warnings: rules.warnings };
}
