"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, getEnv } from "@/db/client";
import { submissions } from "@/db/schema";
import { requireAdmin } from "@/server/auth/require-admin";
import { syncToNotion } from "@/server/notion/sync";

type Secrets = CloudflareEnv & { NOTION_TOKEN?: string };

/** Retry up to 25 failed/skipped submissions per click (keeps the request short). */
export async function retryFailedNotionAction(): Promise<void> {
  const user = await requireAdmin();
  const db = await getDb();
  const env = (await getEnv()) as Secrets;
  const rows = await db.select({ id: submissions.id }).from(submissions)
    .where(and(inArray(submissions.notionSyncStatus, ["failed", "skipped", "pending"]), eq(submissions.isTest, env.APP_ENV !== "production")))
    .limit(25);
  for (const r of rows) await syncToNotion(db, env, r.id, `admin:${user.email}`);
  revalidatePath("/admin/notion");
}
