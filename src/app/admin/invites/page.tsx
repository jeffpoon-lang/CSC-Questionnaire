import { getDb } from "@/db/client";
import { appOrigin } from "@/server/origin";
import { listInvites, listModules } from "@/db/queries/forms";
import { Badge, Card, btnCls, btnSecondaryCls, fmtDate, inputCls } from "@/components/admin/ui";
import { createInviteAction, revokeInviteAction } from "./actions";

export const dynamic = "force-dynamic";

// Server component: time is read once per request (kept out of render for the purity lint rule).
async function currentTime(): Promise<number> {
  return Date.now();
}

export default async function InvitesPage() {
  const now = await currentTime();
  const db = await getDb();
  const [invites, mods] = await Promise.all([listInvites(db), listModules(db)]);
  const activeMods = mods.filter((m) => m.status === "active" && m.currentVersionId);
  const base = (await appOrigin()) ?? "";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">High-ticket 邀請連結</h1>
      <p className="text-sm text-stone-600">邀請連結會在 Q01–Q34 之外加入所選模組（按次序）。提交會記錄 entry_mode=invite、module_ids 及模組版本。連結可設到期日與使用次數，並可隨時撤銷。</p>
      <Card title="建立邀請連結">
        <form action={createInviteAction} className="grid gap-3 text-sm md:grid-cols-2">
          <label>標籤（內部用，例如「診所 A 創辦人」）<input name="label" required className={`${inputCls} mt-1 w-full`} /></label>
          <label>模組次序（選填，slug 以逗號分隔）<input name="module_order" placeholder="team_diag, ops_audit" className={`${inputCls} mt-1 w-full`} /></label>
          <fieldset className="md:col-span-2">
            <legend className="mb-1">附加模組（只顯示已發布且啟用）</legend>
            {activeMods.length === 0 && <p className="text-stone-500">尚未有已發布模組。純 Q01–Q34 邀請連結仍可建立。</p>}
            <div className="flex flex-wrap gap-3">
              {activeMods.map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded border border-stone-300 px-2 py-1"><input type="checkbox" name="module_ids" value={m.id} /> {m.name} <span className="font-mono text-xs text-stone-500">{m.slug}</span></label>
              ))}
            </div>
          </fieldset>
          <label>到期（日數，0 = 不限）<input name="expires_days" type="number" min={0} defaultValue={30} className={`${inputCls} mt-1 w-full`} /></label>
          <label>使用次數上限（0 = 不限）<input name="max_uses" type="number" min={0} defaultValue={1} className={`${inputCls} mt-1 w-full`} /></label>
          <label>預填全名（選填）<input name="lead_hint_name" className={`${inputCls} mt-1 w-full`} /></label>
          <label>預填電郵（選填）<input name="lead_hint_email" type="email" className={`${inputCls} mt-1 w-full`} /></label>
          <div className="md:col-span-2"><button type="submit" className={btnCls}>建立連結</button></div>
        </form>
      </Card>
      <Card title={`連結（${invites.length}）`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-stone-500"><th className="py-1 pr-3">標籤</th><th className="py-1 pr-3">連結</th><th className="py-1 pr-3">模組</th><th className="py-1 pr-3">使用</th><th className="py-1 pr-3">到期</th><th className="py-1 pr-3">狀態</th><th></th></tr></thead>
            <tbody>
              {invites.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-stone-500">尚未有邀請連結</td></tr>}
              {invites.map((i) => {
                const url = `${base}/f/high_ticket?i=${i.token}`;
                const names = i.moduleIds.map((id) => mods.find((m) => m.id === id)?.slug ?? id).join(", ") || "—";
                const expired = i.expiresAt && i.expiresAt.getTime() < now;
                return (
                  <tr key={i.id} className="border-t border-stone-100 align-top">
                    <td className="py-2 pr-3">{i.label}<span className="block text-xs text-stone-500">{fmtDate(i.createdAt)} · {i.createdBy}</span></td>
                    <td className="py-2 pr-3"><input readOnly value={url} className={`${inputCls} w-72 font-mono text-xs`} /></td>
                    <td className="py-2 pr-3 font-mono text-xs">{names}</td>
                    <td className="py-2 pr-3">{i.useCount}{i.maxUses ? ` / ${i.maxUses}` : ""}</td>
                    <td className="py-2 pr-3 text-xs">{i.expiresAt ? fmtDate(i.expiresAt) : "不限"}</td>
                    <td className="py-2 pr-3"><Badge value={i.status === "revoked" ? "spam" : expired ? "closed" : "qualified"} labels={{ spam: "已撤銷", closed: "已到期", qualified: "有效" }} /></td>
                    <td className="py-2 pr-3">{i.status === "active" && <form action={revokeInviteAction}><input type="hidden" name="id" value={i.id} /><button className={btnSecondaryCls} type="submit">撤銷</button></form>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
