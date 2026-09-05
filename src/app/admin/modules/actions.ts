"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { moduleVersions, modules } from "@/db/schema";
import { allFormQuestionIds, allModuleQuestionIds, getModuleById, listModuleVersions } from "@/db/queries/forms";
import { parseModuleDefinition } from "@/engine/definition-schema";
import { moduleQuestionPrefix } from "@/engine/merge";
import { checkPublishRules } from "@/engine/publish-rules";
import type { ModuleDefinition } from "@/engine/types";
import { requireAdmin } from "@/server/auth/require-admin";
import { newId } from "@/server/ids";
import type { EditorState } from "@/components/admin/DefinitionEditor";

export async function createModuleAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(slug) || !name) return;
  const db = await getDb();
  const now = new Date();
  const id = newId();
  const versionId = newId();
  const prefix = moduleQuestionPrefix(slug);
  const def: ModuleDefinition = {
    schemaVersion: 1,
    slug,
    title: name,
    intro: "以下為專屬補充題目。",
    questions: [
      { id: `${prefix}01`, type: "long_text", label: "（範例）請描述你目前團隊最常出現的交接問題。", required: false, piiHint: true },
    ],
  };
  await db.batch([
    db.insert(modules).values({ id, slug, name, formSlug: "high_ticket", status: "active", currentVersionId: null, createdAt: now, updatedAt: now }),
    db.insert(moduleVersions).values({ id: versionId, moduleId: id, version: 1, status: "draft", definitionJson: def, createdBy: user.email, createdAt: now }),
  ]);
  revalidatePath("/admin/modules");
  redirect(`/admin/modules/${id}`);
}

export async function toggleModuleStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "active" && status !== "disabled")) return;
  const db = await getDb();
  await db.update(modules).set({ status, updatedAt: new Date() }).where(eq(modules.id, id));
  revalidatePath("/admin/modules");
}

export async function createModuleDraftAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const mod = await getModuleById(db, id);
  if (!mod) return;
  const versions = await listModuleVersions(db, id);
  if (versions.some((v) => v.status === "draft")) return;
  const base = versions.find((v) => v.id === mod.currentVersionId) ?? versions[0];
  if (!base) return;
  const [{ m }] = await db.select({ m: max(moduleVersions.version) }).from(moduleVersions).where(eq(moduleVersions.moduleId, id));
  await db.insert(moduleVersions).values({ id: newId(), moduleId: id, version: (m ?? 0) + 1, status: "draft", definitionJson: base.definitionJson, createdBy: user.email, createdAt: new Date() });
  revalidatePath(`/admin/modules/${id}`);
}

export async function saveModuleDraftAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const user = await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const raw = String(formData.get("json") ?? "");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (e) {
    return { ok: false, message: `JSON 無法解析：${e instanceof Error ? e.message : ""}` };
  }
  const db = await getDb();
  const mod = await getModuleById(db, moduleId);
  if (!mod) return { ok: false, message: "模組不存在" };
  const [draft] = await db.select().from(moduleVersions).where(eq(moduleVersions.id, versionId)).limit(1);
  if (!draft || draft.moduleId !== moduleId || draft.status !== "draft") return { ok: false, message: "只可以編輯草稿版本" };

  const parsed = parseModuleDefinition(parsedJson);
  if (parsed.value && parsed.value.slug !== mod.slug) parsed.issues.push({ path: "slug", message: `slug 必須是 ${mod.slug}` });
  await db.update(moduleVersions).set({ definitionJson: parsedJson as never, createdBy: user.email }).where(eq(moduleVersions.id, versionId));
  if (parsed.issues.length || !parsed.value) return { ok: false, message: "草稿已儲存，但定義有問題，未能發布：", issues: parsed.issues };

  const priors = (await listModuleVersions(db, moduleId)).filter((v) => v.id !== versionId && v.status !== "draft").map((v) => v.definitionJson.questions);
  const reserved = new Set([...(await allFormQuestionIds(db)), ...(await allModuleQuestionIds(db, moduleId))]);
  const rules = checkPublishRules(parsed.value.questions, priors, reserved);
  if (rules.errors.length) return { ok: false, message: "草稿已儲存，但違反版本規則，未能發布：", issues: rules.errors, warnings: rules.warnings };

  if (intent !== "publish") {
    revalidatePath(`/admin/modules/${moduleId}`);
    return { ok: true, message: "草稿已儲存並通過驗證。", warnings: rules.warnings };
  }
  const now = new Date();
  await db.batch([
    db.update(moduleVersions).set({ status: "archived" }).where(and(eq(moduleVersions.moduleId, moduleId), eq(moduleVersions.status, "published"))),
    db.update(moduleVersions).set({ status: "published", publishedAt: now, definitionJson: parsed.value }).where(eq(moduleVersions.id, versionId)),
    db.update(modules).set({ currentVersionId: versionId, name: parsed.value.title, updatedAt: now }).where(eq(modules.id, moduleId)),
  ]);
  revalidatePath(`/admin/modules/${moduleId}`);
  revalidatePath("/admin/modules");
  return { ok: true, message: `已發布 v${draft.version}。已建立的邀請連結會自動使用此版本；舊提交保留原版本。`, warnings: rules.warnings };
}
