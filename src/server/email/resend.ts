import "server-only";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import type { Db } from "@/db/client";
import { emailLog, formVersions, submissions } from "@/db/schema";
import { newId } from "@/server/ids";
import { loadSettings, settingList, settingString } from "@/server/settings";
import { mergeQuestions } from "@/engine/merge";
import { getModuleVersionsByIds } from "@/db/queries/forms";
import { buildSummary } from "./summary-template";

export interface EmailEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}

/**
 * Send the admin summary for one submission. Never throws; every outcome is
 * recorded in email_log (sent / failed / skipped).
 */
export async function sendSummaryEmail(db: Db, env: EmailEnv, submissionId: string): Promise<void> {
  const logId = newId();
  const now = new Date();
  let to: string[] = [];
  let subject = "";
  try {
    const [s] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!s) return;
    const [v] = await db.select().from(formVersions).where(eq(formVersions.id, s.formVersionId)).limit(1);
    if (!v) return;
    const mods = await getModuleVersionsByIds(db, s.moduleVersionIds);
    const questions = mergeQuestions(v.definitionJson, mods.map((m) => m.definitionJson));

    const st = await loadSettings(db, ["notification_recipients", "admin_base_url"]);
    to = settingList(st, "notification_recipients");
    const base = settingString(st, "admin_base_url");
    const adminUrl = base ? `${base.replace(/\/$/, "")}/admin/submissions/${s.id}` : null;

    const msg = buildSummary({ submission: s, formTitle: v.definitionJson.title, questions, adminUrl });
    subject = msg.subject;

    if (!env.RESEND_API_KEY || to.length === 0) {
      await db.insert(emailLog).values({ id: logId, submissionId, toJson: to, subject, status: "skipped", errorText: !env.RESEND_API_KEY ? "RESEND_API_KEY not set" : "no recipients configured", createdAt: now });
      return;
    }
    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.RESEND_FROM || "CSC Forms <onboarding@resend.dev>";
    const { data, error } = await resend.emails.send({ from, to, subject, text: msg.text, html: msg.html });
    if (error) {
      await db.insert(emailLog).values({ id: logId, submissionId, toJson: to, subject, status: "failed", errorText: String(error.message ?? error), createdAt: now });
      return;
    }
    await db.insert(emailLog).values({ id: logId, submissionId, toJson: to, subject, status: "sent", providerId: data?.id ?? null, createdAt: now });
  } catch (e) {
    try {
      await db.insert(emailLog).values({ id: logId, submissionId, toJson: to, subject: subject || "(unbuilt)", status: "failed", errorText: e instanceof Error ? e.message : String(e), createdAt: now });
    } catch {
      /* swallow: background task must never throw */
    }
  }
}
