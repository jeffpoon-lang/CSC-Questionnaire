import { getDb } from "@/db/client";
import { loadSettings, SETTING_KEYS, SETTING_META, settingBool, settingList } from "@/server/settings";
import { Card, btnCls, inputCls } from "@/components/admin/ui";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await getDb();
  const st = await loadSettings(db);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <p className="text-sm text-stone-600">所有對外連結、通知收件人與 Notion Database 均在此配置，不會寫死在程式內。Secrets（Resend／Notion token）以 wrangler secret 設定。</p>
      <Card>
        <form action={saveSettingsAction} className="space-y-5">
          {SETTING_KEYS.map((key) => {
            const m = SETTING_META[key];
            const v = st[key];
            return (
              <div key={key} className="grid gap-1 sm:grid-cols-3">
                <label htmlFor={key} className="text-sm font-medium text-stone-800">{m.label}<span className="block font-mono text-xs font-normal text-stone-400">{key}</span></label>
                <div className="sm:col-span-2">
                  {m.kind === "boolean" ? (
                    <input id={key} name={key} type="checkbox" defaultChecked={settingBool(st, key)} className="h-4 w-4 accent-stone-900" />
                  ) : m.kind === "list" ? (
                    <textarea id={key} name={key} rows={3} defaultValue={settingList(st, key).join("\n")} className={`${inputCls} w-full`} />
                  ) : (
                    <input id={key} name={key} type={m.kind === "number" ? "number" : "text"} defaultValue={typeof v === "string" || typeof v === "number" ? String(v) : ""} className={`${inputCls} w-full`} />
                  )}
                  {m.hint && <p className="mt-1 text-xs text-stone-500">{m.hint}</p>}
                </div>
              </div>
            );
          })}
          <button type="submit" className={btnCls}>儲存設定</button>
        </form>
      </Card>
    </div>
  );
}
