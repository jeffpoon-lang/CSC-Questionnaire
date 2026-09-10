import { describe, expect, it } from "vitest";
import { buildPreflight, verdict, type PreflightInput } from "@/server/preflight";

const ready: PreflightInput = {
  appEnv: "production",
  appOrigin: "https://forms.example.com",
  secrets: { resendApiKey: true, resendFrom: true, notionToken: true, turnstileSecret: false },
  settings: {
    privacy_url: "https://example.com/privacy",
    whatsapp_invite_url: "https://chat.whatsapp.com/x",
    csc_info_url: "https://example.com/csc",
    admin_base_url: "https://forms.example.com",
    notification_recipients: ["ops@example.com"],
    notion_db_generic_csc: "ds:1",
    notion_db_high_ticket: "ds:2",
    notion_db_community: "ds:3",
  },
  forms: [
    { slug: "community", status: "enabled", hasPublishedVersion: true },
    { slug: "generic_csc", status: "enabled", hasPublishedVersion: true },
    { slug: "high_ticket", status: "enabled", hasPublishedVersion: true },
  ],
  counts: { testSubmissions: 0, liveSubmissions: 12, owners: 1, notionFailed: 0, emailFailed: 0 },
};

const find = (input: PreflightInput, id: string) =>
  buildPreflight(input).flatMap((s) => s.checks).find((c) => c.id === id);

describe("preflight", () => {
  it("passes when production is fully configured", () => {
    const v = verdict(buildPreflight(ready));
    expect(v.ready).toBe(true);
    expect(v.blockers).toBe(0);
  });

  it("blocks production on any missing piece of Carey-supplied content", () => {
    for (const key of ["privacy_url", "whatsapp_invite_url", "csc_info_url", "admin_base_url"] as const) {
      const input = { ...ready, settings: { ...ready.settings, [key]: "" } };
      const v = verdict(buildPreflight(input));
      expect(v.ready, key).toBe(false);
      expect(find(input, `setting.${key}`)?.state).toBe("fail");
    }
  });

  it("blocks production when nobody would receive the notification", () => {
    const input = { ...ready, settings: { ...ready.settings, notification_recipients: [] } };
    expect(verdict(buildPreflight(input)).ready).toBe(false);
  });

  it("treats a missing integration as a blocker in production but a warning elsewhere", () => {
    const noNotion = { ...ready, secrets: { ...ready.secrets, notionToken: false } };
    expect(find(noNotion, "secret.notion_token")?.level).toBe("blocker");
    expect(verdict(buildPreflight(noNotion)).ready).toBe(false);

    const staging = { ...noNotion, appEnv: "staging" };
    expect(find(staging, "secret.notion_token")?.level).toBe("warning");
    expect(verdict(buildPreflight(staging)).ready).toBe(true);
  });

  it("blocks production on leftover TEST data but not on staging", () => {
    const prod = { ...ready, counts: { ...ready.counts, testSubmissions: 11 } };
    expect(find(prod, "data.test_rows")?.state).toBe("fail");
    expect(verdict(buildPreflight(prod)).ready).toBe(false);

    const staging = { ...prod, appEnv: "staging" };
    expect(find(staging, "data.test_rows")?.state).toBe("skip");
    expect(verdict(buildPreflight(staging)).ready).toBe(true);
  });

  it("catches an APP_ORIGIN placeholder that was never replaced", () => {
    const input = { ...ready, appOrigin: "https://forms.REPLACE_WITH_CAREY_DOMAIN" };
    expect(find(input, "env.app_origin")?.state).toBe("fail");
    expect(verdict(buildPreflight(input)).ready).toBe(false);
  });

  it("blocks when a form is disabled or has no published version", () => {
    const disabled = { ...ready, forms: [{ slug: "community", status: "disabled", hasPublishedVersion: true }] };
    expect(verdict(buildPreflight(disabled)).ready).toBe(false);

    const unpublished = { ...ready, forms: [{ slug: "community", status: "enabled", hasPublishedVersion: false }] };
    expect(verdict(buildPreflight(unpublished)).ready).toBe(false);
  });

  it("blocks when there is no owner account", () => {
    const input = { ...ready, counts: { ...ready.counts, owners: 0 } };
    expect(verdict(buildPreflight(input)).ready).toBe(false);
  });

  it("keeps sync and delivery failures as warnings, not blockers", () => {
    const input = { ...ready, counts: { ...ready.counts, notionFailed: 3, emailFailed: 2 } };
    const v = verdict(buildPreflight(input));
    expect(v.ready).toBe(true);
    expect(v.warnings).toBe(2);
  });

  it("never reports a secret's value, only its presence", () => {
    const text = JSON.stringify(buildPreflight(ready));
    expect(text).not.toMatch(/ntn_|re_[A-Za-z0-9]/);
    expect(find(ready, "secret.resend_api_key")?.detail).toBe("已設定");
  });
});
