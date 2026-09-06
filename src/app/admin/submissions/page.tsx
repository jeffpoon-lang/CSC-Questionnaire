import Link from "next/link";
import { getDb } from "@/db/client";
import { listSubmissions, type SubmissionFilters } from "@/db/queries/submissions";
import { Badge, Card, FORM_LABELS, NOTION_LABELS, STATUS_LABELS, btnCls, btnSecondaryCls, fmtDate, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f: SubmissionFilters = {
    form: str(sp.form), status: str(sp.status), owner: str(sp.owner), source: str(sp.source),
    from: str(sp.from), to: str(sp.to), q: str(sp.q), tag: str(sp.tag), notion: str(sp.notion), entry: str(sp.entry),
    includeTest: str(sp.test) === "1",
  };
  const page = Math.max(1, Number(str(sp.page) ?? 1) || 1);
  const db = await getDb();
  const { rows, total } = await listSubmissions(db, f, page, 50);
  const pages = Math.max(1, Math.ceil(total / 50));
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : [])));
  const exportUrl = `/api/admin/export?${qs.toString()}`;
  const pageUrl = (p: number) => { const q = new URLSearchParams(qs); q.set("page", String(p)); return `/admin/submissions?${q}`; };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">提交（{total}）</h1>
        <a href={exportUrl} className={btnSecondaryCls}>匯出 CSV（目前篩選）</a>
      </div>
      <Card>
        <form method="get" className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4 lg:grid-cols-6">
          <select name="form" defaultValue={f.form ?? ""} className={inputCls}>
            <option value="">所有表單</option>
            {Object.entries(FORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="status" defaultValue={f.status ?? ""} className={inputCls}>
            <option value="">所有狀態</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input name="owner" placeholder="Review owner" defaultValue={f.owner ?? ""} className={inputCls} />
          <input name="source" placeholder="來源 / utm_source" defaultValue={f.source ?? ""} className={inputCls} />
          <input name="from" type="date" defaultValue={f.from ?? ""} className={inputCls} />
          <input name="to" type="date" defaultValue={f.to ?? ""} className={inputCls} />
          <input name="q" placeholder="稱呼 / 電郵 / 電話 / ID" defaultValue={f.q ?? ""} className={`${inputCls} col-span-2`} />
          <input name="tag" placeholder="標籤 例如 C04:leads_sales" defaultValue={f.tag ?? ""} className={inputCls} />
          <select name="notion" defaultValue={f.notion ?? ""} className={inputCls}>
            <option value="">Notion（全部）</option>
            {Object.entries(NOTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="entry" defaultValue={f.entry ?? ""} className={inputCls}>
            <option value="">入口（全部）</option>
            <option value="public">公開</option>
            <option value="invite">Invite</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="test" value="1" defaultChecked={f.includeTest} /> 包括 TEST</label>
          <div className="col-span-2 flex gap-2 md:col-span-4 lg:col-span-6">
            <button type="submit" className={btnCls}>篩選</button>
            <Link href="/admin/submissions" className={btnSecondaryCls}>清除</Link>
          </div>
        </form>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="py-1 pr-3">提交時間</th><th className="py-1 pr-3">表單</th><th className="py-1 pr-3">稱呼</th><th className="py-1 pr-3">聯絡</th>
                <th className="py-1 pr-3">來源</th><th className="py-1 pr-3">狀態</th><th className="py-1 pr-3">Owner</th><th className="py-1 pr-3">Notion</th><th className="py-1 pr-3">標記</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-stone-500">沒有符合的提交</td></tr>}
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-stone-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap"><Link className="underline" href={`/admin/submissions/${s.id}`}>{fmtDate(s.submittedAt)}</Link></td>
                  <td className="py-2 pr-3">{FORM_LABELS[s.formSlug] ?? s.formSlug} <span className="text-stone-400">v{s.formVersion}</span></td>
                  <td className="py-2 pr-3">{s.displayName ?? "—"}</td>
                  <td className="py-2 pr-3 text-stone-600">{[s.email, s.phoneE164].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="py-2 pr-3 text-stone-600">{[s.source, s.utmMedium, s.utmCampaign].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="py-2 pr-3"><Badge value={s.internalStatus} labels={STATUS_LABELS} /></td>
                  <td className="py-2 pr-3">{s.reviewOwner ?? "—"}</td>
                  <td className="py-2 pr-3"><Badge value={s.notionSyncStatus} labels={NOTION_LABELS} /></td>
                  <td className="py-2 pr-3 text-xs text-stone-500">
                    {s.isTest && <span className="mr-1 rounded bg-amber-100 px-1 text-amber-800">TEST</span>}
                    {s.entryMode === "invite" && <span className="mr-1 rounded bg-violet-100 px-1 text-violet-800">invite</span>}
                    {s.duplicateOf && <span className="rounded bg-stone-200 px-1">重覆</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            {page > 1 && <Link className="underline" href={pageUrl(page - 1)}>上一頁</Link>}
            <span>第 {page} / {pages} 頁</span>
            {page < pages && <Link className="underline" href={pageUrl(page + 1)}>下一頁</Link>}
          </div>
        )}
      </Card>
    </div>
  );
}
