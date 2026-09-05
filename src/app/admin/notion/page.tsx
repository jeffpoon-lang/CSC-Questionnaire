import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, getEnv } from "@/db/client";
import { notionSyncLog, submissions } from "@/db/schema";
import { Badge, Card, FORM_LABELS, NOTION_LABELS, btnCls, fmtDate } from "@/components/admin/ui";
import { retryFailedNotionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotionPage() {
  const db = await getDb();
  const env = await getEnv();
  const failed = await db.select().from(submissions).where(inArray(submissions.notionSyncStatus, ["failed", "skipped", "pending"])).orderBy(desc(submissions.submittedAt)).limit(100);
  const recent = await db.select({ log: notionSyncLog, formSlug: submissions.formSlug, name: submissions.displayName })
    .from(notionSyncLog).innerJoin(submissions, eq(notionSyncLog.submissionId, submissions.id))
    .orderBy(desc(notionSyncLog.startedAt)).limit(50);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notion 同步</h1>
        <form action={retryFailedNotionAction}><button type="submit" className={btnCls}>重試未同步（最多 25 個／次，{env.APP_ENV === "production" ? "正式" : "TEST"}資料）</button></form>
      </div>
      <p className="text-sm text-stone-600">Notion 只是營運跟進 view；D1 是唯一完整資料來源。同步失敗不會影響提交。「略過」代表 NOTION_TOKEN 或 Database ID 未設定。</p>
      <Card title={`未同步／失敗（${failed.length}）`}>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="py-1 pr-3">提交時間</th><th className="py-1 pr-3">表單</th><th className="py-1 pr-3">稱呼</th><th className="py-1 pr-3">狀態</th><th className="py-1 pr-3">TEST</th></tr></thead>
          <tbody>
            {failed.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-stone-500">全部已同步</td></tr>}
            {failed.map((s) => (
              <tr key={s.id} className="border-t border-stone-100">
                <td className="py-2 pr-3"><Link className="underline" href={`/admin/submissions/${s.id}`}>{fmtDate(s.submittedAt)}</Link></td>
                <td className="py-2 pr-3">{FORM_LABELS[s.formSlug] ?? s.formSlug}</td>
                <td className="py-2 pr-3">{s.displayName ?? "—"}</td>
                <td className="py-2 pr-3"><Badge value={s.notionSyncStatus} labels={NOTION_LABELS} /></td>
                <td className="py-2 pr-3">{s.isTest ? "TEST" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="最近 50 次同步紀錄">
        <ul className="space-y-1 text-xs text-stone-600">
          {recent.map(({ log, formSlug, name }) => (
            <li key={log.id}>
              {fmtDate(log.startedAt)} · {FORM_LABELS[formSlug] ?? formSlug} · {name ?? "—"} · #{log.attempt} <Badge value={log.status} /> · {log.triggeredBy}
              {log.errorText && <span className="block text-red-600">{log.errorText}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
