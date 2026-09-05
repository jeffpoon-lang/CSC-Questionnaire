import "server-only";
import { and, count, desc, eq, exists, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { submissionTags, submissions, type Submission } from "@/db/schema";

export interface SubmissionFilters {
  form?: string;
  status?: string;
  owner?: string;
  source?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  q?: string;
  tag?: string; // "C02:beauty"
  includeTest?: boolean;
  notion?: string;
  entry?: string;
}

export function buildWhere(f: SubmissionFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (f.form) conds.push(eq(submissions.formSlug, f.form));
  if (f.status) conds.push(eq(submissions.internalStatus, f.status as Submission["internalStatus"]));
  if (f.owner) conds.push(eq(submissions.reviewOwner, f.owner));
  if (f.notion) conds.push(eq(submissions.notionSyncStatus, f.notion as Submission["notionSyncStatus"]));
  if (f.entry === "invite" || f.entry === "public") conds.push(eq(submissions.entryMode, f.entry));
  if (f.source) conds.push(or(eq(submissions.source, f.source), eq(submissions.utmSource, f.source))!);
  if (f.from) {
    const d = new Date(`${f.from}T00:00:00+08:00`);
    if (!Number.isNaN(d.getTime())) conds.push(gte(submissions.submittedAt, d));
  }
  if (f.to) {
    const d = new Date(`${f.to}T23:59:59.999+08:00`);
    if (!Number.isNaN(d.getTime())) conds.push(lte(submissions.submittedAt, d));
  }
  if (f.q && f.q.trim()) {
    const pat = `%${f.q.trim().replace(/[%_]/g, "")}%`;
    conds.push(or(like(submissions.displayName, pat), like(submissions.email, pat), like(submissions.phoneE164, pat), eq(submissions.id, f.q.trim()))!);
  }
  if (f.tag && f.tag.includes(":")) {
    const [qid, ...rest] = f.tag.split(":");
    const value = rest.join(":");
    conds.push(
      exists(
        db_select_tag(qid, value),
      ),
    );
  }
  if (!f.includeTest) conds.push(eq(submissions.isTest, false));
  return conds.length ? and(...conds) : undefined;
}

// Subquery builder kept separate so `buildWhere` stays readable.
function db_select_tag(qid: string, value: string) {
  return sql`(select 1 from ${submissionTags} where ${submissionTags.submissionId} = ${submissions.id} and ${submissionTags.questionId} = ${qid} and ${submissionTags.value} = ${value})`;
}

export async function listSubmissions(db: Db, f: SubmissionFilters, page = 1, limit = 50): Promise<{ rows: Submission[]; total: number }> {
  const where = buildWhere(f);
  const [rows, totals] = await Promise.all([
    db.select().from(submissions).where(where).orderBy(desc(submissions.submittedAt)).limit(limit).offset((page - 1) * limit),
    db.select({ n: count() }).from(submissions).where(where),
  ]);
  return { rows, total: totals[0]?.n ?? 0 };
}

export async function* iterateSubmissions(db: Db, f: SubmissionFilters, chunk = 200): AsyncGenerator<Submission[]> {
  const where = buildWhere(f);
  let offset = 0;
  for (;;) {
    const rows = await db.select().from(submissions).where(where).orderBy(desc(submissions.submittedAt)).limit(chunk).offset(offset);
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < chunk) return;
    offset += chunk;
  }
}

export async function countByStatus(db: Db): Promise<Array<{ formSlug: string; status: string; n: number }>> {
  const rows = await db
    .select({ formSlug: submissions.formSlug, status: submissions.internalStatus, n: count() })
    .from(submissions)
    .where(eq(submissions.isTest, false))
    .groupBy(submissions.formSlug, submissions.internalStatus);
  return rows.map((r) => ({ formSlug: r.formSlug, status: r.status, n: r.n }));
}
