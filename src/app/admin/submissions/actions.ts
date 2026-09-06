"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, getEnv, getExecutionContext } from "@/db/client";
import { INTERNAL_STATUSES, submissions } from "@/db/schema";
import { requireAdmin } from "@/server/auth/require-admin";
import { syncToNotion } from "@/server/notion/sync";

type Secrets = CloudflareEnv & { NOTION_TOKEN?: string };

export async function updateSubmissionAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("internal_status") ?? "");
  const owner = String(formData.get("review_owner") ?? "").trim();
  if (!id || !(INTERNAL_STATUSES as readonly string[]).includes(status)) return;
  const db = await getDb();
  const [before] = await db.select({ status: submissions.internalStatus, notion: submissions.notionPageId }).from(submissions).where(eq(submissions.id, id)).limit(1);
  await db.update(submissions).set({ internalStatus: status as (typeof INTERNAL_STATUSES)[number], reviewOwner: owner || null }).where(eq(submissions.id, id));
  // One-way push of follow-up status to Notion (only when a page exists already).
  if (before && before.status !== status && before.notion) {
    const env = (await getEnv()) as Secrets;
    const ctx = await getExecutionContext();
    ctx.waitUntil(syncToNotion(db, env, id, `admin:${user.email}`));
  }
  revalidatePath(`/admin/submissions/${id}`);
}

export async function retryNotionAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await getDb();
  const env = (await getEnv()) as Secrets;
  await syncToNotion(db, env, id, `admin:${user.email}`);
  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/admin/notion");
}
