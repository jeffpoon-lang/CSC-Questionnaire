import Link from "next/link";
import { getDb } from "@/db/client";
import { formVersions } from "@/db/schema";
import { listForms } from "@/db/queries/forms";
import { Badge, Card, FORM_LABELS, btnSecondaryCls, fmtDate } from "@/components/admin/ui";
import { setFormAccessAction, toggleFormStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const db = await getDb();
  const rows = await listForms(db);
  const versions = await db.select().from(formVersions);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">表單</h1>
      <p className="text-sm text-stone-600">三份問卷共用同一引擎。停用後公開 URL 會顯示「未開放」。題目以版本管理：舊提交永遠以提交當時的版本顯示。</p>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="py-1 pr-3">表單</th><th className="py-1 pr-3">狀態</th><th className="py-1 pr-3">入口</th><th className="py-1 pr-3">目前版本</th><th className="py-1 pr-3">草稿</th><th className="py-1 pr-3">更新</th><th className="py-1 pr-3"></th></tr></thead>
          <tbody>
            {rows.map((f) => {
              const cur = versions.find((v) => v.id === f.currentVersionId);
              const draft = versions.find((v) => v.formId === f.id && v.status === "draft");
              return (
                <tr key={f.id} className="border-t border-stone-100 align-top">
                  <td className="py-2 pr-3"><Link className="underline" href={`/admin/forms/${f.slug}`}>{FORM_LABELS[f.slug] ?? f.slug}</Link><span className="block text-xs text-stone-500">{f.title}</span><a className="text-xs text-stone-400 underline" href={`/f/${f.slug}`} target="_blank" rel="noopener">/f/{f.slug}</a></td>
                  <td className="py-2 pr-3"><Badge value={f.status === "enabled" ? "qualified" : "spam"} labels={{ qualified: "啟用", spam: "停用" }} /></td>
                  <td className="py-2 pr-3">{f.access === "public" ? "公開" : "只限邀請"}</td>
                  <td className="py-2 pr-3">{cur ? `v${cur.version}` : "—"}<span className="block text-xs text-stone-500">{fmtDate(cur?.publishedAt)}</span></td>
                  <td className="py-2 pr-3">{draft ? `v${draft.version}（草稿）` : "—"}</td>
                  <td className="py-2 pr-3 text-xs text-stone-500">{fmtDate(f.updatedAt)}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={toggleFormStatusAction}><input type="hidden" name="slug" value={f.slug} /><input type="hidden" name="status" value={f.status === "enabled" ? "disabled" : "enabled"} /><button className={btnSecondaryCls} type="submit">{f.status === "enabled" ? "停用" : "啟用"}</button></form>
                      <form action={setFormAccessAction}><input type="hidden" name="slug" value={f.slug} /><input type="hidden" name="access" value={f.access === "public" ? "invite_only" : "public"} /><button className={btnSecondaryCls} type="submit">{f.access === "public" ? "改為只限邀請" : "改為公開"}</button></form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
