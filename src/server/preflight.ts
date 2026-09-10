import type { SettingKey, SettingsMap } from "@/server/settings";

/**
 * Go-live readiness. The rules live here as a pure function so they can be
 * unit-tested and so the same list reads identically on staging and on
 * production — what differs is only which severities block.
 *
 * A check never reports a secret's value, only whether it is present.
 */

export type CheckLevel = "blocker" | "warning" | "info";
export type CheckState = "pass" | "fail" | "skip";

export interface Check {
  id: string;
  label: string;
  level: CheckLevel;
  state: CheckState;
  detail: string;
  /** What to do about it, when it is not passing. */
  fix?: string;
}

export interface PreflightSection {
  title: string;
  checks: Check[];
}

export interface PreflightInput {
  appEnv: string;
  appOrigin: string | null;
  /** Presence only — never the values. */
  secrets: { resendApiKey: boolean; resendFrom: boolean; notionToken: boolean; turnstileSecret: boolean };
  settings: SettingsMap;
  forms: Array<{ slug: string; status: string; hasPublishedVersion: boolean }>;
  counts: {
    testSubmissions: number;
    liveSubmissions: number;
    owners: number;
    notionFailed: number;
    emailFailed: number;
  };
}

const PLACEHOLDER = /REPLACE_/;

const str = (m: SettingsMap, k: SettingKey): string =>
  typeof m[k] === "string" ? (m[k] as string).trim() : "";

const list = (m: SettingsMap, k: SettingKey): string[] =>
  Array.isArray(m[k]) ? (m[k] as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

function setting(
  m: SettingsMap,
  key: SettingKey,
  label: string,
  level: CheckLevel,
  fix: string,
): Check {
  const v = str(m, key);
  return {
    id: `setting.${key}`,
    label,
    level,
    state: v ? "pass" : "fail",
    detail: v ? v : "未設定",
    fix: v ? undefined : fix,
  };
}

function secret(present: boolean, id: string, label: string, level: CheckLevel, fix: string): Check {
  return {
    id: `secret.${id}`,
    label,
    level,
    state: present ? "pass" : "fail",
    detail: present ? "已設定" : "未設定",
    fix: present ? undefined : fix,
  };
}

export function buildPreflight(input: PreflightInput): PreflightSection[] {
  const { appEnv, appOrigin, secrets, settings: st, forms, counts } = input;
  const isProd = appEnv === "production";
  // Outside production a missing integration is expected, not a blocker.
  const integration: CheckLevel = isProd ? "blocker" : "warning";

  const content: Check[] = [
    setting(st, "privacy_url", "私隱聲明連結", "blocker", "由 Carey／Jojo 提供最終私隱聲明，於設定頁填入。未設定時 /privacy 只顯示暫代文字。"),
    setting(st, "whatsapp_invite_url", "WhatsApp Community 邀請連結", "blocker", "Community 問卷成功頁的主要 CTA；未設定時按鈕不會顯示。"),
    setting(st, "csc_info_url", "CSC 課程資訊頁連結", "blocker", "G17／C06 選課程資訊時的次要 CTA。"),
    setting(st, "admin_base_url", "Admin 網址", "blocker", "Email 摘要與 Notion 的 Admin 連結靠它組成。"),
  ];

  const recipients = list(st, "notification_recipients");
  content.push({
    id: "setting.notification_recipients",
    label: "新提交通知收件人",
    level: "blocker",
    state: recipients.length > 0 ? "pass" : "fail",
    detail: recipients.length > 0 ? `${recipients.length} 個` : "未設定",
    fix: recipients.length > 0 ? undefined : "沒有收件人時，摘要 email 會記為 skipped，團隊收不到新提交通知。",
  });

  const integrations: Check[] = [
    secret(secrets.resendApiKey, "resend_api_key", "Resend API key", integration, "未設定時 email_log 會記為 skipped，提交不受影響但沒有人收到通知。"),
    {
      id: "secret.resend_from",
      label: "Resend 寄件地址（已驗證網域）",
      level: integration,
      state: secrets.resendFrom ? "pass" : "fail",
      detail: secrets.resendFrom ? "已設定" : "未設定，會用共用測試寄件地址",
      fix: secrets.resendFrom
        ? undefined
        : "測試寄件地址只寄得到 Resend 帳戶持有人自己的電郵，團隊其他收件人一封都收不到。production 必須用已驗證網域的寄件地址。",
    },
    secret(secrets.notionToken, "notion_token", "Notion integration token", integration, "未設定時同步記為 skipped。"),
    setting(st, "notion_db_generic_csc", "Notion Database（Generic CSC）", integration, "於設定頁填 database id 或 ds:<data_source_id>，並把 database 分享給 integration。"),
    setting(st, "notion_db_high_ticket", "Notion Database（High-ticket）", integration, "同上。"),
    setting(st, "notion_db_community", "Notion Database（Community）", integration, "同上。"),
  ];

  const platform: Check[] = [
    {
      id: "env.app_origin",
      label: "APP_ORIGIN 已填真實網址",
      level: isProd ? "blocker" : "warning",
      state: appOrigin && !PLACEHOLDER.test(appOrigin) ? "pass" : "fail",
      detail: appOrigin ?? "未設定",
      fix: appOrigin && !PLACEHOLDER.test(appOrigin) ? undefined : "wrangler.jsonc 的該環境 vars.APP_ORIGIN 仍是佔位值。",
    },
    {
      id: "admin.owner",
      label: "至少一個 owner 帳戶",
      level: "blocker",
      state: counts.owners > 0 ? "pass" : "fail",
      detail: `${counts.owners} 個`,
      fix: counts.owners > 0 ? undefined : "依 docs/deploy.md〈建立 Admin 帳戶〉建立，owner 必須由 Carey 或其指定人員持有。",
    },
  ];

  for (const f of forms) {
    platform.push({
      id: `form.${f.slug}`,
      label: `表單 ${f.slug}`,
      level: "blocker",
      state: f.status === "enabled" && f.hasPublishedVersion ? "pass" : "fail",
      detail: `${f.status === "enabled" ? "已啟用" : "已停用"}、${f.hasPublishedVersion ? "有已發布版本" : "沒有已發布版本"}`,
      fix: f.status === "enabled" && f.hasPublishedVersion ? undefined : "於 Admin →「表單」啟用並發布版本。",
    });
  }

  const data: Check[] = [
    {
      id: "data.test_rows",
      label: "TEST 資料已清除",
      level: isProd ? "blocker" : "info",
      state: counts.testSubmissions === 0 ? "pass" : isProd ? "fail" : "skip",
      detail: `${counts.testSubmissions} 筆 is_test=1`,
      fix:
        counts.testSubmissions === 0
          ? undefined
          : isProd
            ? "計劃書 §10：測試資料必須在上 production 前清除或隔離。用 pnpm purge:test 處理。"
            : "staging 保留 TEST 資料屬正常；上 production 前才需要清走。",
    },
    {
      id: "data.notion_failed",
      label: "沒有未處理的 Notion 同步失敗",
      level: "warning",
      state: counts.notionFailed === 0 ? "pass" : "fail",
      detail: `${counts.notionFailed} 筆 failed`,
      fix: counts.notionFailed === 0 ? undefined : "於 Admin →「Notion」按重試；先確認 database id 與分享權限正確。",
    },
    {
      id: "data.email_failed",
      label: "沒有寄送失敗的通知",
      level: "warning",
      state: counts.emailFailed === 0 ? "pass" : "fail",
      detail: `${counts.emailFailed} 筆 failed`,
      fix: counts.emailFailed === 0 ? undefined : "看 email_log.error_text；最常見是寄件網域未驗證。",
    },
  ];

  return [
    { title: "內容（Carey／Jojo 提供）", checks: content },
    { title: "整合", checks: integrations },
    { title: "平台", checks: platform },
    { title: "資料", checks: data },
  ];
}

export interface PreflightVerdict {
  ready: boolean;
  blockers: number;
  warnings: number;
  passed: number;
  total: number;
}

/** Only blockers gate go-live; warnings are for the operator to weigh. */
export function verdict(sections: PreflightSection[]): PreflightVerdict {
  const checks = sections.flatMap((s) => s.checks);
  const counted = checks.filter((c) => c.state !== "skip");
  const blockers = counted.filter((c) => c.level === "blocker" && c.state === "fail").length;
  const warnings = counted.filter((c) => c.level === "warning" && c.state === "fail").length;
  return {
    ready: blockers === 0,
    blockers,
    warnings,
    passed: counted.filter((c) => c.state === "pass").length,
    total: counted.length,
  };
}
