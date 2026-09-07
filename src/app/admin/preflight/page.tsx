import { and, count, eq } from "drizzle-orm";
import { getDb, getEnv } from "@/db/client";
import { adminUsers, emailLog, forms, formVersions, submissions } from "@/db/schema";
import { Card } from "@/components/admin/ui";
import { buildPreflight, verdict, type Check, type PreflightInput } from "@/server/preflight";
import { loadSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

type Secrets = CloudflareEnv & {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  NOTION_TOKEN?: string;
  TURNSTILE_SECRET_KEY?: string;
};

const has = (v: string | undefined) => typeof v === "string" && v.trim() !== "";

async function one(promise: Promise<Array<{ n: number }>>): Promise<number> {
  const rows = await promise;
  return rows[0]?.n ?? 0;
}

export default async function PreflightPage() {
  const db = await getDb();
  const env = (await getEnv()) as Secrets;
  const st = await loadSettings(db);

  const formRows = await db
    .select({ slug: forms.slug, status: forms.status, currentVersionId: forms.currentVersionId })
    .from(forms);
  const publishedIds = new Set(
    (await db.select({ id: formVersions.id }).from(formVersions).where(eq(formVersions.status, "published"))).map((r) => r.id),
  );

  const input: PreflightInput = {
    appEnv: env.APP_ENV,
    appOrigin: env.APP_ORIGIN ?? null,
    secrets: {
      resendApiKey: has(env.RESEND_API_KEY),
      resendFrom: has(env.RESEND_FROM),
      notionToken: has(env.NOTION_TOKEN),
      turnstileSecret: has(env.TURNSTILE_SECRET_KEY),
    },
    settings: st,
    forms: formRows.map((f) => ({
      slug: f.slug,
      status: f.status,
      hasPublishedVersion: Boolean(f.currentVersionId && publishedIds.has(f.currentVersionId)),
    })),
    counts: {
      testSubmissions: await one(db.select({ n: count() }).from(submissions).where(eq(submissions.isTest, true))),
      liveSubmissions: await one(db.select({ n: count() }).from(submissions).where(eq(submissions.isTest, false))),
      owners: await one(db.select({ n: count() }).from(adminUsers).where(eq(adminUsers.role, "owner"))),
      notionFailed: await one(
        db.select({ n: count() }).from(submissions).where(and(eq(submissions.notionSyncStatus, "failed"), eq(submissions.isTest, env.APP_ENV !== "production"))),
      ),
      emailFailed: await one(db.select({ n: count() }).from(emailLog).where(eq(emailLog.status, "failed"))),
    },
  };

  const sections = buildPreflight(input);
  const v = verdict(sections);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">上線前檢查</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          只有 <strong>blocker</strong> 會擋住上線；warning 由操作者自行判斷。此頁不會顯示任何 secret 的內容，只顯示有沒有設定。
          完整交接步驟見 <code className="rounded bg-stone-100 px-1">docs/production-runbook.md</code>。
        </p>
      </div>

      <div
        className={`rounded-md border px-4 py-3 text-sm ${
          v.ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
        }`}
      >
        <p className="font-semibold">
          {v.ready ? `可以上線（${env.APP_ENV}）` : `未可上線：${v.blockers} 項 blocker 未通過`}
        </p>
        <p className="mt-0.5">
          {v.passed} / {v.total} 項通過
          {v.warnings > 0 && `，另有 ${v.warnings} 項 warning`}
        </p>
      </div>

      {sections.map((section) => (
        <Card key={section.title} title={section.title}>
          <ul className="divide-y divide-stone-200">
            {section.checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const tone =
    check.state === "pass"
      ? "bg-emerald-100 text-emerald-800"
      : check.state === "skip"
        ? "bg-stone-100 text-stone-600"
        : check.level === "blocker"
          ? "bg-red-100 text-red-800"
          : "bg-amber-100 text-amber-800";
  const word =
    check.state === "pass" ? "通過" : check.state === "skip" ? "不適用" : check.level === "blocker" ? "BLOCKER" : "WARNING";

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 text-sm">
      <span className={`mt-0.5 inline-block shrink-0 rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{word}</span>
      <span className="min-w-[12rem] flex-1 font-medium text-stone-900">{check.label}</span>
      <span className="w-full text-xs text-stone-600 sm:w-auto sm:min-w-[10rem] sm:text-right">{check.detail}</span>
      {check.fix && <p className="w-full text-xs leading-relaxed text-stone-500">{check.fix}</p>}
    </li>
  );
}
