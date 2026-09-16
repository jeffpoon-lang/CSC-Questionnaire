"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/server/auth/require-admin";
import { parseSettingsForm } from "@/server/settings-form";
import { SETTING_KEYS, SETTING_META, type SettingKey } from "@/server/settings";

export interface SettingsState {
  ok?: boolean;
  message?: string;
  invalidKeys?: SettingKey[];
}

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireAdmin();
  const db = await getDb();
  const now = new Date();

  const { values: parsed, invalidKeys } = parseSettingsForm(
    SETTING_KEYS.map((key) => ({ key, kind: SETTING_META[key].kind })),
    (key) => {
      const raw = formData.get(key);
      return typeof raw === "string" ? raw : null;
    },
  );

  // Reject the whole save rather than writing the rest: a partial write that
  // silently drops the field the operator just edited is indistinguishable
  // from a successful save.
  if (invalidKeys.length) {
    const names = invalidKeys.map((k) => SETTING_META[k].label).join("、");
    return {
      ok: false,
      invalidKeys,
      message: `未儲存：${names} 必須以 https:// 開頭，或者以 / 開頭的站內路徑。`,
    };
  }

  const statements = parsed.map(([key, value]) =>
    db.insert(settings).values({ key, valueJson: value, updatedAt: now, updatedBy: user.email })
      .onConflictDoUpdate({ target: settings.key, set: { valueJson: value, updatedAt: now, updatedBy: user.email } }),
  );
  if (statements.length) await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  revalidatePath("/admin/settings");
  return { ok: true, message: `已儲存 ${statements.length} 項設定。` };
}

export type { SettingKey };
