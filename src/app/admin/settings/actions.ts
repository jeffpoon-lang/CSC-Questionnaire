"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/server/auth/require-admin";
import { SETTING_KEYS, SETTING_META, type SettingKey } from "@/server/settings";

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const db = await getDb();
  const now = new Date();
  const statements = [];
  for (const key of SETTING_KEYS) {
    const raw = formData.get(key);
    const kind = SETTING_META[key].kind;
    let value: unknown;
    if (kind === "boolean") value = raw === "on" || raw === "true";
    else if (kind === "number") value = Number(String(raw ?? "").trim()) || 0;
    else if (kind === "list") value = String(raw ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    else value = String(raw ?? "").trim();
    if (kind === "url" && value && !/^https?:\/\//.test(String(value)) && !String(value).startsWith("/")) continue;
    statements.push(
      db.insert(settings).values({ key, valueJson: value, updatedAt: now, updatedBy: user.email })
        .onConflictDoUpdate({ target: settings.key, set: { valueJson: value, updatedAt: now, updatedBy: user.email } }),
    );
  }
  if (statements.length) await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  revalidatePath("/admin/settings");
}

export type { SettingKey };
