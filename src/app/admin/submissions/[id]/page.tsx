import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { emailLog, formVersions, inviteLinks, notionSyncLog, submissions } from "@/db/schema";
import { getModuleVersionsByIds } from "@/db/queries/forms";
import { mergeQuestions } from "@/engine/merge";
import type { Question } from "@/engine/types";
import { Badge, Card, FORM_LABELS, NOTION_LABELS, STATUS_LABELS, btnCls, btnSecondaryCls, fmtDate, inputCls } from "@/components/admin/ui";
import { retryNotionAction, updateSubmissionAction } from "../actions";

export const dynamic = "force-dynamic";

function renderAnswer(q: Question, v: unknown, all: Question[]): React.ReactNode {
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="text-stone-400">—</span>;
  if (q.type === "single_select" || q.type === "multi_select") {
    const src = q.optionsFrom ? all.find((x) => x.id === q.optionsFrom?.questionId) : undefined;
    const opts = [...(q.options ?? []), ...((src && "options" in src && src.options) || []), ...(q.optionsFrom?.append ?? [])];
    const vals = Array.isArray(v) ? v : [v];
    return vals.map((x) => opts.find((o) => o.value === x)?.label ?? String(x)).join("、");
  }
  if (q.type === "consent" && typeof v === "object" && !Array.isArray(v)) {
    return q.items.map((i) => `${(v as Record<string, boolean>)[i.key] ? "✅" : "⬜"} ${i.label}`).join("\n");
  }
  if (q.type === "url" && typeof v === "string") return <a className="underline" href={v} target="_blank" rel="noopener noreferrer">{v}</a>;
  return String(v);
}

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [s] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!s) notFound();
  const [v] = await db.select().from(formVersions).where(eq(formVersions.id, s.formVersionId)).limit(1);
  const mods = await getModuleVersionsByIds(db, s.moduleVersionIds);
  const questions = v ? mergeQuestions(v.definitionJson, mods.map((m) => m.definitionJson)) : [];
  const [syncRows, mailRows, invite] = await Promise.all([
    db.select().from(notionSyncLog).where(eq(notionSyncLog.submissionId, id)).orderBy(desc(notionSyncLog.attempt)).limit(10),
    db.select().from(emailLog).where(eq(emailLog.submissionId, id)).orderBy(desc(emailLog.createdAt)).limit(5),
    s.inviteLinkId ? db.select().from(inviteLinks).where(eq(inviteLinks.id, s.inviteLinkId)).limit(1).then((r) => r[0] ?? null) : Promise.resolve(null),
  ]);

  const meta: Array<[string, React.ReactNode]> = [
    ["Submission ID", s.id], ["Lead ID", s.leadId],
    ["表單", `${FORM_LABELS[s.formSlug] ?? s.formSlug} v${s.formVersion}`],
    ["模組", s.moduleVersions.length ? s.moduleVersions.map((m) => `${m.slug}@v${m.version}`).join("、") : "—"],
    ["入口", s.entryMode === "invite" ? `Invite${invite ? `：${invite.label}` : ""}` : "公開"],
    ["開始 / 提交", `${fmtDate(s.createdAt)} → ${fmtDate(s.submittedAt)}`],
    ["來源", [s.source, s.utmSource, s.utmMedium, s.utmCampaign, s.utmTerm, s.utmContent].filter(Boolean).join(" / ") || "—"],
    ["Landing / CTA / Referrer", [s.landingPage, s.cta, s.referrer].filter(Boolean).join(" · ") || "—"],
    ["同意", `資料使用：${s.consentApplication ? "是" : "否"}　推廣：${s.consentMarketing ? "是" : "否"}`],
    ["重覆", s.duplicateOf ? <Link className="underline" href={`/admin/submissions/${s.duplicateOf}`}>{s.duplicateOf}</Link> : "—"],
    ["TEST", s.isTest ? "是" : "否"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/submissions" className="text-sm underline">← 返回列表</Link>
        <h1 className="text-xl font-semibold">{s.displayName ?? "（未提供稱呼）"}</h1>
        <Badge value={s.internalStatus} labels={STATUS_LABELS} />
        {s.isTest && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">TEST</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="答案（按提交時的題目版本顯示）">
            <dl className="divide-y divide-stone-100">
              {questions.map((q) => (
                <div key={q.id} className="grid gap-1 py-3 sm:grid-cols-3">
                  <dt className="text-sm text-stone-500"><span className="mr-1 font-mono text-xs text-stone-400">{q.id}</span>{q.label}</dt>
                  <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">{renderAnswer(q, s.answersJson[q.id], questions)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="內部處理">
            <form action={updateSubmissionAction} className="space-y-3 text-sm">
              <input type="hidden" name="id" value={s.id} />
              <label className="block">狀態
                <select name="internal_status" defaultValue={s.internalStatus} className={`${inputCls} mt-1 w-full`}>
                  {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="block">Review owner
                <input name="review_owner" defaultValue={s.reviewOwner ?? ""} placeholder="例如 Jojo" className={`${inputCls} mt-1 w-full`} />
              </label>
              <button type="submit" className={btnCls}>儲存</button>
            </form>
          </Card>
          <Card title="資料">
            <dl className="space-y-2 text-sm">
              {meta.map(([k, val]) => (
                <div key={k}><dt className="text-stone-500">{k}</dt><dd className="break-all">{val}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="Notion 同步" actions={<form action={retryNotionAction}><input type="hidden" name="id" value={s.id} /><button className={btnSecondaryCls} type="submit">重試同步</button></form>}>
            <p className="text-sm"><Badge value={s.notionSyncStatus} labels={NOTION_LABELS} /> {s.notionPageId && <span className="ml-2 font-mono text-xs text-stone-500">{s.notionPageId}</span>}</p>
            <ul className="mt-3 space-y-1 text-xs text-stone-600">
              {syncRows.map((r) => (
                <li key={r.id}>#{r.attempt} {fmtDate(r.startedAt)} · {r.status} · {r.triggeredBy}{r.errorText && <span className="block text-red-600">{r.errorText}</span>}</li>
              ))}
            </ul>
          </Card>
          <Card title="Email 通知">
            <ul className="space-y-1 text-xs text-stone-600">
              {mailRows.length === 0 && <li>—</li>}
              {mailRows.map((r) => (
                <li key={r.id}>{fmtDate(r.createdAt)} · {r.status} · {r.toJson.join(", ") || "（無收件人）"}{r.errorText && <span className="block text-red-600">{r.errorText}</span>}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
