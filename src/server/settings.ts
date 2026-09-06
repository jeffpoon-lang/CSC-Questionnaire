import "server-only";
import { inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { settings } from "@/db/schema";

export const SETTING_KEYS = [
  "whatsapp_invite_url",
  "csc_info_url",
  "privacy_url",
  "notification_recipients",
  "notion_db_generic_csc",
  "notion_db_high_ticket",
  "notion_db_community",
  "duplicate_window_days",
  "turnstile_enabled",
  "turnstile_site_key",
  "admin_base_url",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_META: Record<SettingKey, { label: string; hint: string; kind: "url" | "text" | "list" | "number" | "boolean" }> = {
  whatsapp_invite_url: { label: "WhatsApp Community 邀請連結", hint: "由 Carey／Jojo 提供。未設定時成功頁不會顯示加入按鈕。", kind: "url" },
  csc_info_url: { label: "CSC 課程資訊頁連結", hint: "G17／C06 選 CSC 課程資訊時的次要 CTA。", kind: "url" },
  privacy_url: { label: "私隱聲明連結", hint: "最終私隱聲明；未設定時 /privacy 會顯示待補頁面。", kind: "url" },
  notification_recipients: { label: "新提交通知收件人", hint: "每行一個電郵。", kind: "list" },
  notion_db_generic_csc: { label: "Notion Database ID（Generic CSC）", hint: "未設定時同步會標記為 skipped。", kind: "text" },
  notion_db_high_ticket: { label: "Notion Database ID（High-ticket）", hint: "", kind: "text" },
  notion_db_community: { label: "Notion Database ID（Community）", hint: "", kind: "text" },
  duplicate_window_days: { label: "重覆提交判定天數", hint: "同一電郵／電話在此天數內再提交同一表單會標記 duplicate_of。", kind: "number" },
  turnstile_enabled: { label: "啟用 Cloudflare Turnstile", hint: "需同時設定 TURNSTILE_SECRET_KEY secret 及下面 site key。", kind: "boolean" },
  turnstile_site_key: { label: "Turnstile Site Key", hint: "", kind: "text" },
  admin_base_url: { label: "Admin 網址", hint: "用於 Email 內的 Admin 連結，例如 https://forms.example.com", kind: "url" },
};

export type SettingsMap = Partial<Record<SettingKey, unknown>>;

export async function loadSettings(db: Db, keys: readonly SettingKey[] = SETTING_KEYS): Promise<SettingsMap> {
  const rows = await db.select().from(settings).where(inArray(settings.key, [...keys]));
  const out: SettingsMap = {};
  for (const r of rows) out[r.key as SettingKey] = r.valueJson;
  return out;
}

export function settingString(map: SettingsMap, key: SettingKey): string | null {
  const v = map[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function settingList(map: SettingsMap, key: SettingKey): string[] {
  const v = map[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  if (typeof v === "string") return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function settingNumber(map: SettingsMap, key: SettingKey, fallback: number): number {
  const v = map[key];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function settingBool(map: SettingsMap, key: SettingKey): boolean {
  const v = map[key];
  return v === true || v === "true" || v === 1;
}

export function settingsLookup(map: SettingsMap) {
  return (key: string) => (SETTING_KEYS as readonly string[]).includes(key) ? settingString(map, key as SettingKey) : null;
}
