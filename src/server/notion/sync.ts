import "server-only";
import { desc, eq } from "drizzle-orm";
import { Client } from "@notionhq/client";
import type { Db } from "@/db/client";
import { formVersions, notionSyncLog, submissions, type Submission } from "@/db/schema";
import { getModuleVersionsByIds } from "@/db/queries/forms";
import { mergeQuestions } from "@/engine/merge";
import { newId } from "@/server/ids";
import { loadSettings, settingString, type SettingKey } from "@/server/settings";
import { mapCommunity } from "./mappers/community";
import { mapGenericCsc } from "./mappers/generic_csc";
import { mapHighTicket } from "./mappers/high_ticket";
import type { NotionProps } from "./mappers/common";

export interface NotionEnv {
  NOTION_TOKEN?: string;
}

const DB_SETTING: Record<string, SettingKey> = {
  generic_csc: "notion_db_generic_csc",
  high_ticket: "notion_db_high_ticket",
  community: "notion_db_community",
};

export interface SyncResult {
  status: "success" | "failed" | "skipped";
  pageId?: string | null;
  error?: string;
}

/**
 * Idempotent one-way sync of a submission to Notion.
 * - update when notion_page_id exists, create otherwise
 * - "skipped" when token / database id not configured
 * - every call appends a notion_sync_log row and updates the submission status
 * Never throws.
 */
export async function syncToNotion(db: Db, env: NotionEnv, submissionId: string, triggeredBy: string): Promise<SyncResult> {
  const startedAt = new Date();
  const logId = newId();
  const prev = await db.select({ attempt: notionSyncLog.attempt }).from(notionSyncLog).where(eq(notionSyncLog.submissionId, submissionId)).orderBy(desc(notionSyncLog.attempt)).limit(1);
  const attempt = (prev[0]?.attempt ?? 0) + 1;

  const finish = async (r: SyncResult, s?: Submission) => {
    const status = r.status === "success" ? "synced" : r.status === "skipped" ? "skipped" : "failed";
    try {
      await db.batch([
        db.insert(notionSyncLog).values({ id: logId, submissionId, attempt, status: r.status, notionPageId: r.pageId ?? s?.notionPageId ?? null, errorText: r.error ?? null, startedAt, finishedAt: new Date(), triggeredBy }),
        db.update(submissions).set({ notionSyncStatus: status, notionPageId: r.pageId ?? s?.notionPageId ?? null }).where(eq(submissions.id, submissionId)),
      ]);
    } catch {
      /* background: never throw */
    }
    return r;
  };

  try {
    const [s] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!s) return finish({ status: "failed", error: "submission not found" });

    const st = await loadSettings(db);
    const dbKey = DB_SETTING[s.formSlug];
    const databaseId = dbKey ? settingString(st, dbKey) : null;
    if (!env.NOTION_TOKEN) return finish({ status: "skipped", error: "NOTION_TOKEN not set" }, s);
    if (!databaseId) return finish({ status: "skipped", error: `Notion database id not set (${dbKey})` }, s);

    const [v] = await db.select().from(formVersions).where(eq(formVersions.id, s.formVersionId)).limit(1);
    if (!v) return finish({ status: "failed", error: "form version not found" }, s);
    const mods = await getModuleVersionsByIds(db, s.moduleVersionIds);
    const questions = mergeQuestions(v.definitionJson, mods.map((m) => m.definitionJson));
    const base = settingString(st, "admin_base_url");
    const adminUrl = base ? `${base.replace(/\/$/, "")}/admin/submissions/${s.id}` : null;

    let props: NotionProps;
    switch (s.formSlug) {
      case "generic_csc": props = mapGenericCsc(s, questions, adminUrl); break;
      case "high_ticket": props = mapHighTicket(s, questions, adminUrl); break;
      case "community": props = mapCommunity(s, questions, adminUrl); break;
      default: return finish({ status: "failed", error: `no mapper for ${s.formSlug}` }, s);
    }

    const notion = new Client({ auth: env.NOTION_TOKEN, timeoutMs: 20_000 });
    // Setting value may be a database id or a data source id ("ds:<id>").
    const parent = databaseId.startsWith("ds:") ? { data_source_id: databaseId.slice(3) } : { database_id: databaseId };

    if (s.notionPageId) {
      await notion.pages.update({ page_id: s.notionPageId, properties: props as never });
      return finish({ status: "success", pageId: s.notionPageId }, s);
    }
    const page = await notion.pages.create({ parent, properties: props as never });
    return finish({ status: "success", pageId: page.id }, s);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish({ status: "failed", error: msg.slice(0, 2000) });
  }
}
