import { getDb } from "@/db/client";
import { loadSettings, SETTING_KEYS, SETTING_META, settingBool, settingList } from "@/server/settings";
import { Card } from "@/components/admin/ui";
import { SettingsForm, type SettingsField } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await getDb();
  const st = await loadSettings(db);
  const fields: SettingsField[] = SETTING_KEYS.map((key) => {
    const m = SETTING_META[key];
    const v = st[key];
    return {
      key,
      label: m.label,
      hint: m.hint,
      kind: m.kind,
      value: m.kind === "list" ? settingList(st, key).join("\n") : typeof v === "string" || typeof v === "number" ? String(v) : "",
      checked: m.kind === "boolean" ? settingBool(st, key) : false,
    };
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <p className="text-sm text-stone-600">所有對外連結、通知收件人與 Notion Database 均在此配置，不會寫死在程式內。Secrets（Resend／Notion token）以 wrangler secret 設定。</p>
      <Card>
        <SettingsForm fields={fields} />
      </Card>
    </div>
  );
}
