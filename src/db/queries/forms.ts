import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { formVersions, forms, inviteLinks, moduleVersions, modules, type Form, type FormVersion, type InviteLink, type Module, type ModuleVersion } from "@/db/schema";

export async function getFormBySlug(db: Db, slug: string): Promise<Form | null> {
  const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getFormWithCurrentVersion(db: Db, slug: string): Promise<{ form: Form; version: FormVersion } | null> {
  const form = await getFormBySlug(db, slug);
  if (!form || !form.currentVersionId) return null;
  const v = await db.select().from(formVersions).where(eq(formVersions.id, form.currentVersionId)).limit(1);
  if (!v[0]) return null;
  return { form, version: v[0] };
}

export async function getFormVersionById(db: Db, id: string): Promise<FormVersion | null> {
  const v = await db.select().from(formVersions).where(eq(formVersions.id, id)).limit(1);
  return v[0] ?? null;
}

export async function listFormVersions(db: Db, formId: string): Promise<FormVersion[]> {
  return db.select().from(formVersions).where(eq(formVersions.formId, formId)).orderBy(desc(formVersions.version));
}

export async function getInviteByToken(db: Db, token: string): Promise<InviteLink | null> {
  const rows = await db.select().from(inviteLinks).where(eq(inviteLinks.token, token)).limit(1);
  return rows[0] ?? null;
}

export function inviteIsUsable(invite: InviteLink, now = new Date()): { ok: boolean; reason?: string } {
  if (invite.status !== "active") return { ok: false, reason: "revoked" };
  if (invite.expiresAt && invite.expiresAt.getTime() < now.getTime()) return { ok: false, reason: "expired" };
  if (typeof invite.maxUses === "number" && invite.useCount >= invite.maxUses) return { ok: false, reason: "used_up" };
  return { ok: true };
}

export interface ResolvedModule {
  module: Module;
  version: ModuleVersion;
}

/** Resolve active modules (in the given order) to their current published version. */
export async function resolveModules(db: Db, moduleIds: string[]): Promise<ResolvedModule[]> {
  if (moduleIds.length === 0) return [];
  const mods = await db.select().from(modules).where(and(inArray(modules.id, moduleIds), eq(modules.status, "active")));
  const versionIds = mods.map((m) => m.currentVersionId).filter((x): x is string => Boolean(x));
  const versions = versionIds.length
    ? await db.select().from(moduleVersions).where(and(inArray(moduleVersions.id, versionIds), eq(moduleVersions.status, "published")))
    : [];
  const out: ResolvedModule[] = [];
  for (const id of moduleIds) {
    const m = mods.find((x) => x.id === id);
    if (!m || !m.currentVersionId) continue;
    const v = versions.find((x) => x.id === m.currentVersionId);
    if (!v) continue;
    out.push({ module: m, version: v });
  }
  return out;
}

export async function getModuleVersionsByIds(db: Db, ids: string[]): Promise<ModuleVersion[]> {
  if (ids.length === 0) return [];
  return db.select().from(moduleVersions).where(inArray(moduleVersions.id, ids));
}

export async function listForms(db: Db): Promise<Form[]> {
  return db.select().from(forms).orderBy(forms.slug);
}

export async function listModules(db: Db): Promise<Module[]> {
  return db.select().from(modules).orderBy(modules.slug);
}

export async function getModuleById(db: Db, id: string): Promise<Module | null> {
  const rows = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listModuleVersions(db: Db, moduleId: string): Promise<ModuleVersion[]> {
  return db.select().from(moduleVersions).where(eq(moduleVersions.moduleId, moduleId)).orderBy(desc(moduleVersions.version));
}

export async function getModuleVersionById(db: Db, id: string): Promise<ModuleVersion | null> {
  const rows = await db.select().from(moduleVersions).where(eq(moduleVersions.id, id)).limit(1);
  return rows[0] ?? null;
}

/** All question ids ever used by any module version (for core publish rules). */
export async function allModuleQuestionIds(db: Db, excludeModuleId?: string): Promise<Set<string>> {
  const rows = await db.select({ moduleId: moduleVersions.moduleId, def: moduleVersions.definitionJson }).from(moduleVersions);
  const ids = new Set<string>();
  for (const r of rows) {
    if (excludeModuleId && r.moduleId === excludeModuleId) continue;
    for (const q of r.def.questions) ids.add(q.id);
  }
  return ids;
}

/** All core question ids across all form versions (for module publish rules). */
export async function allFormQuestionIds(db: Db): Promise<Set<string>> {
  const rows = await db.select({ def: formVersions.definitionJson }).from(formVersions);
  const ids = new Set<string>();
  for (const r of rows) for (const q of r.def.questions) ids.add(q.id);
  return ids;
}

export async function listInvites(db: Db): Promise<InviteLink[]> {
  return db.select().from(inviteLinks).orderBy(desc(inviteLinks.createdAt)).limit(200);
}
