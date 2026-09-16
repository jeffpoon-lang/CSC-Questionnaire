import type { SettingKey } from "@/server/settings";

/**
 * Turning the settings form into values to store, kept pure so it can be
 * unit-tested and so the "this URL is not storable" rule has one definition.
 *
 * A malformed URL is reported, never dropped: the previous version skipped the
 * row, which looked exactly like a successful save to whoever had just typed it.
 */

export type SettingKind = "url" | "text" | "list" | "number" | "boolean";

export interface ParsedSettings {
  values: Array<[SettingKey, unknown]>;
  invalidKeys: SettingKey[];
}

export function storableUrl(value: string) {
  return /^https?:\/\//.test(value) || value.startsWith("/");
}

export function parseSettingsForm(
  fields: Array<{ key: SettingKey; kind: SettingKind }>,
  get: (key: SettingKey) => string | null,
): ParsedSettings {
  const values: Array<[SettingKey, unknown]> = [];
  const invalidKeys: SettingKey[] = [];

  for (const { key, kind } of fields) {
    const raw = get(key);
    let value: unknown;
    if (kind === "boolean") value = raw === "on" || raw === "true";
    else if (kind === "number") value = Number(String(raw ?? "").trim()) || 0;
    else if (kind === "list") value = String(raw ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    else value = String(raw ?? "").trim();

    if (kind === "url" && typeof value === "string" && value !== "" && !storableUrl(value)) {
      invalidKeys.push(key);
      continue;
    }
    values.push([key, value]);
  }

  return { values, invalidKeys };
}
