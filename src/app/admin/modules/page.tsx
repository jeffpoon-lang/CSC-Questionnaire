import Link from "next/link";
import { getDb } from "@/db/client";
import { moduleVersions } from "@/db/schema";
import { listModules } from "@/db/queries/forms";
import { Badge, Card, btnCls, btnSecondaryCls, fmtDate, inputCls } from "@/components/admin/ui";
import { createModuleAction, toggleModuleStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const db = await getDb();
  const rows = await listModules(db);
  const versions = await db.select().from(moduleVersions);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tailored Modules（High-ticket 專屬題組）</h1>
      <p className="text-sm text-stone-600">模組只會經 Admin 建立的邀請連結出現，公開 URL 永遠只有 Q01–Q34。模組題目 ID 必須以 <code>M_&lt;slug&gt;_</code> 開頭。修改模組會建立新版本，不會覆蓋舊提交。</p>
      <Card title="新增模組">
        <form action={createModuleAction} className="flex flex-wrap items-end gap-2 text-sm">
          <label>slug（小寫英數字及底線）<input name="slug" required pattern="[a-z][a-z0-9_]{1,40}" placeholder="team_diag" className={`${inputCls} mt-1 block`} /></label>
          <label>名稱<input name="name" required placeholder="團隊診斷補充" className={`${inputCls} mt-1 block`} /></label>
          <button type="submit" className={btnCls}>建立草稿</button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="py-1 pr-3">模組</th><th className="py-1 pr-3">狀態</th><th className="py-1 pr-3">目前版本</th><th className="py-1 pr-3">草稿</th><th className="py-1 pr-3">更新</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-stone-500">尚未有模組</td></tr>}
            {rows.map((m) => {
              const cur = versions.find((v) => v.id === m.currentVersionId);
              const draft = versions.find((v) => v.moduleId === m.id && v.status === "draft");
              return (
                <tr key={m.id} className="border-t border-stone-100">
                  <td className="py-2 pr-3"><Link className="underline" href={`/admin/modules/${m.id}`}>{m.name}</Link><span className="block font-mono text-xs text-stone-500">{m.slug}</span></td>
                  <td className="py-2 pr-3"><Badge value={m.status === "active" ? "qualified" : "spam"} labels={{ qualified: "啟用", spam: "停用" }} /></td>
                  <td className="py-2 pr-3">{cur ? `v${cur.version}` : "未發布"}</td>
                  <td className="py-2 pr-3">{draft ? `v${draft.version}` : "—"}</td>
                  <td className="py-2 pr-3 text-xs text-stone-500">{fmtDate(m.updatedAt)}</td>
                  <td className="py-2 pr-3"><form action={toggleModuleStatusAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={m.status === "active" ? "disabled" : "active"} /><button className={btnSecondaryCls} type="submit">{m.status === "active" ? "停用" : "啟用"}</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
