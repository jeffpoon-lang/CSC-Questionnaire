import "server-only";
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { inviteLinks, leads, notionSyncLog, submissionTags, submissions } from "@/db/schema";
import { getFormWithCurrentVersion, getInviteByToken, inviteIsUsable, resolveModules } from "@/db/queries/forms";
import { mergeQuestions } from "@/engine/merge";
import { extractTags } from "@/engine/tags";
import type { Answers, ConsentAnswer, Question } from "@/engine/types";
import { validateAnswers } from "@/engine/zod-from-definition";
import { newId, randomToken, sha256Hex } from "@/server/ids";
import { loadSettings, settingBool, settingNumber } from "@/server/settings";
import { cleanTracking, trackingSchema } from "@/server/tracking";
import { verifyTurnstile } from "@/server/turnstile";

export const submitBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  meta: z.object({
    formVersionId: z.string().min(1),
    inviteToken: z.string().max(200).optional(),
    startedAt: z.number().optional(),
    tracking: trackingSchema.optional(),
    test: z.boolean().optional(),
  }),
  hp: z.string().optional(),
  turnstileToken: z.string().optional(),
});
export type SubmitBody = z.infer<typeof submitBodySchema>;

export type SubmitResult =
  | { ok: true; redirect: string; submissionId: string }
  | { ok: false; status: number; code: string; message: string; errors?: Record<string, string> };

export interface SubmitContext {
  appEnv: string;
  turnstileSecret?: string;
  ip?: string | null;
  userAgent?: string | null;
}

function firstString(a: Answers, ids: string[]): string | null {
  for (const id of ids) {
    const v = a[id];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function findByType(questions: Question[], type: Question["type"]): string[] {
  return questions.filter((q) => q.type === type).map((q) => q.id);
}

function consentFlag(questions: Question[], answers: Answers, key: string): boolean {
  for (const q of questions) {
    if (q.type !== "consent") continue;
    const v = answers[q.id] as ConsentAnswer | undefined;
    if (v && v[key] === true) return true;
  }
  return false;
}

export async function processSubmission(db: Db, slug: string, body: SubmitBody, ctx: SubmitContext): Promise<{ result: SubmitResult; background?: () => Promise<void> }> {
  const now = new Date();

  // 1. Form + version + invite
  const loaded = await getFormWithCurrentVersion(db, slug);
  if (!loaded || loaded.form.status !== "enabled") return { result: { ok: false, status: 404, code: "form_unavailable", message: "此表單目前未開放。" } };
  const { form, version } = loaded;
  if (version.id !== body.meta.formVersionId) return { result: { ok: false, status: 409, code: "version_stale", message: "表單已更新，請重新載入頁面（你的草稿會保留）。" } };

  let invite = null as Awaited<ReturnType<typeof getInviteByToken>>;
  if (body.meta.inviteToken) {
    invite = await getInviteByToken(db, body.meta.inviteToken);
    if (!invite || invite.formId !== form.id || !inviteIsUsable(invite, now).ok) {
      return { result: { ok: false, status: 403, code: "invite_invalid", message: "此邀請連結已失效，請聯絡團隊。" } };
    }
  } else if (form.access === "invite_only") {
    return { result: { ok: false, status: 403, code: "invite_required", message: "此表單只限邀請填寫。" } };
  }
  const modules = invite ? await resolveModules(db, invite.moduleIds) : [];
  const def = version.definitionJson;
  const questions = mergeQuestions(def, modules.map((m) => m.version.definitionJson));

  // 2. Anti-bot
  if (def.settings.honeypot && body.hp && body.hp.trim() !== "") {
    // Pretend success; nothing is written.
    return { result: { ok: true, redirect: `/f/${slug}/success/${randomToken(12)}`, submissionId: "" } };
  }
  const st = await loadSettings(db);
  if (def.settings.turnstile || settingBool(st, "turnstile_enabled")) {
    if (!ctx.turnstileSecret || !body.turnstileToken || !(await verifyTurnstile(ctx.turnstileSecret, body.turnstileToken, ctx.ip))) {
      return { result: { ok: false, status: 400, code: "turnstile_failed", message: "人機驗證失敗，請重試。" } };
    }
  }

  // 3. Validate + normalize (hidden questions are stripped inside)
  const validation = validateAnswers(questions, body.answers as Answers);
  if (!validation.ok) return { result: { ok: false, status: 422, code: "validation", message: "請檢查標示的題目。", errors: validation.errors } };
  const answers = validation.data;

  // 4. Lead resolution + duplicate detection
  const email = firstString(answers, findByType(questions, "email"));
  const phone = firstString(answers, findByType(questions, "phone"));
  const displayName = firstString(answers, ["G01", "C01", "Q01"]) ?? firstString(answers, findByType(questions, "short_text"));
  const isTest = ctx.appEnv !== "production" || body.meta.test === true;

  let leadId: string | null = null;
  if (email || phone) {
    const conds = [] as ReturnType<typeof eq>[];
    if (email) conds.push(eq(leads.email, email));
    if (phone) conds.push(eq(leads.phoneE164, phone));
    const found = await db.select().from(leads).where(conds.length === 1 ? conds[0] : or(...conds)).orderBy(desc(leads.lastSeenAt)).limit(1);
    leadId = found[0]?.id ?? null;
  }
  const isNewLead = !leadId;
  if (!leadId) leadId = newId();

  let duplicateOf: string | null = null;
  const windowDays = def.settings.duplicateWindowDays ?? settingNumber(st, "duplicate_window_days", 30);
  if (!isNewLead && windowDays > 0) {
    const since = new Date(now.getTime() - windowDays * 86_400_000);
    const dup = await db.select({ id: submissions.id }).from(submissions)
      .where(and(eq(submissions.leadId, leadId), eq(submissions.formSlug, slug), gt(submissions.submittedAt, since)))
      .orderBy(desc(submissions.submittedAt)).limit(1);
    duplicateOf = dup[0]?.id ?? null;
  }

  // 5. Atomic write
  const submissionId = newId();
  const publicToken = randomToken(18);
  const tags = extractTags(questions, answers);
  const ipHash = ctx.ip ? (await sha256Hex(`${ctx.ip}|${slug}`)).slice(0, 32) : null;
  const tracking = cleanTracking(body.meta.tracking ?? {});

  const statements = [
    isNewLead
      ? db.insert(leads).values({ id: leadId, displayName, email, phoneE164: phone, firstSeenAt: now, lastSeenAt: now, isTest })
      : db.update(leads).set({ displayName: displayName ?? undefined, email: email ?? undefined, phoneE164: phone ?? undefined, lastSeenAt: now }).where(eq(leads.id, leadId)),
    db.insert(submissions).values({
      id: submissionId,
      publicToken,
      leadId,
      formId: form.id,
      formSlug: slug,
      formVersionId: version.id,
      formVersion: version.version,
      moduleIds: modules.map((m) => m.module.id),
      moduleVersionIds: modules.map((m) => m.version.id),
      moduleVersions: modules.map((m) => ({ moduleId: m.module.id, slug: m.module.slug, version: m.version.version })),
      entryMode: invite ? "invite" : "public",
      inviteLinkId: invite?.id ?? null,
      answersJson: answers,
      displayName,
      email,
      phoneE164: phone,
      createdAt: body.meta.startedAt && body.meta.startedAt < now.getTime() ? new Date(body.meta.startedAt) : now,
      submittedAt: now,
      source: tracking.source ?? tracking.utm_source ?? null,
      utmSource: tracking.utm_source ?? null,
      utmMedium: tracking.utm_medium ?? null,
      utmCampaign: tracking.utm_campaign ?? null,
      utmTerm: tracking.utm_term ?? null,
      utmContent: tracking.utm_content ?? null,
      landingPage: tracking.landing_page ?? null,
      cta: tracking.cta ?? null,
      referrer: tracking.referrer ?? null,
      consentApplication: consentFlag(questions, answers, "application"),
      consentMarketing: consentFlag(questions, answers, "marketing"),
      internalStatus: "new",
      duplicateOf,
      notionSyncStatus: "pending",
      isTest,
      ipHash,
      userAgent: ctx.userAgent?.slice(0, 300) ?? null,
    }),
    db.insert(notionSyncLog).values({ id: newId(), submissionId, attempt: 0, status: "pending", startedAt: now, triggeredBy: "submit" }),
  ] as const;

  const extra = [] as Array<(typeof statements)[number]>;
  // D1: keep each statement under the parameter limit — chunk tag inserts.
  for (let i = 0; i < tags.length; i += 25) {
    extra.push(db.insert(submissionTags).values(tags.slice(i, i + 25).map((t) => ({ submissionId, questionId: t.questionId, value: t.value }))) as never);
  }
  if (invite) extra.push(db.update(inviteLinks).set({ useCount: sql`${inviteLinks.useCount} + 1` }).where(eq(inviteLinks.id, invite.id)) as never);

  await db.batch([statements[0], statements[1], statements[2], ...extra] as unknown as Parameters<Db["batch"]>[0]);

  return {
    result: { ok: true, redirect: `/f/${slug}/success/${publicToken}`, submissionId },
  };
}
