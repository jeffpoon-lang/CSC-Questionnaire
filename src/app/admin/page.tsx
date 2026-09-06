import Link from "next/link";
import { getDb } from "@/db/client";
import { countByStatus } from "@/db/queries/submissions";
import { Card, FORM_LABELS, STATUS_LABELS } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = await getDb();
  const rows = await countByStatus(db);
  const forms = ["community", "generic_csc", "high_ticket"];
  const statuses = Object.keys(STATUS_LABELS);
  const get = (f: string, s: string) => rows.find((r) => r.formSlug === f && r.status === s)?.n ?? 0;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">總覽（不含 TEST 資料）</h1>
      <Card title="各表單提交狀態">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="py-1 pr-4">表單</th>
                {statuses.map((s) => <th key={s} className="py-1 pr-4">{STATUS_LABELS[s]}</th>)}
                <th className="py-1">合計</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f} className="border-t border-stone-100">
                  <td className="py-2 pr-4"><Link className="underline" href={`/admin/submissions?form=${f}`}>{FORM_LABELS[f]}</Link></td>
                  {statuses.map((s) => <td key={s} className="py-2 pr-4">{get(f, s)}</td>)}
                  <td className="py-2 font-medium">{statuses.reduce((a, s) => a + get(f, s), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="快速連結">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><Link className="underline" href="/admin/submissions?status=new">未處理的新提交</Link></li>
          <li><Link className="underline" href="/admin/notion">Notion 同步失敗紀錄</Link></li>
          <li><Link className="underline" href="/admin/settings">設定 WhatsApp 連結、通知收件人、Notion Database</Link></li>
        </ul>
      </Card>
    </div>
  );
}
