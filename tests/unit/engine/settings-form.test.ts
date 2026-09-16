import { describe, expect, it } from "vitest";
import { parseSettingsForm, storableUrl, type SettingKind } from "@/server/settings-form";
import type { SettingKey } from "@/server/settings";

function parse(fields: Array<[SettingKey, SettingKind]>, raw: Partial<Record<SettingKey, string>>) {
  return parseSettingsForm(
    fields.map(([key, kind]) => ({ key, kind })),
    (key) => raw[key] ?? null,
  );
}

describe("storableUrl", () => {
  it("accepts absolute http(s) and site-relative paths", () => {
    expect(storableUrl("https://example.com/x")).toBe(true);
    expect(storableUrl("http://example.com")).toBe(true);
    expect(storableUrl("/privacy")).toBe(true);
  });

  it("rejects a bare domain and other schemes", () => {
    expect(storableUrl("wa.me/abc123")).toBe(false);
    expect(storableUrl("example.com/page")).toBe(false);
    expect(storableUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("parseSettingsForm", () => {
  it("reports a malformed URL instead of dropping it silently", () => {
    const out = parse([["whatsapp_invite_url", "url"]], { whatsapp_invite_url: "wa.me/abc123" });
    expect(out.invalidKeys).toEqual(["whatsapp_invite_url"]);
    expect(out.values).toEqual([]);
  });

  it("keeps the rest of the form parsed so the caller can reject the whole save", () => {
    const out = parse(
      [
        ["whatsapp_invite_url", "url"],
        ["notion_db_community", "text"],
      ],
      { whatsapp_invite_url: "wa.me/abc123", notion_db_community: "ds:abc" },
    );
    expect(out.invalidKeys).toEqual(["whatsapp_invite_url"]);
    expect(out.values).toEqual([["notion_db_community", "ds:abc"]]);
  });

  it("stores a valid URL and allows clearing one", () => {
    const out = parse(
      [
        ["privacy_url", "url"],
        ["csc_info_url", "url"],
      ],
      { privacy_url: "/privacy", csc_info_url: "" },
    );
    expect(out.invalidKeys).toEqual([]);
    expect(out.values).toEqual([
      ["privacy_url", "/privacy"],
      ["csc_info_url", ""],
    ]);
  });

  it("splits a list on newlines and commas, trimming blanks", () => {
    const out = parse([["notification_recipients", "list"]], {
      notification_recipients: " a@example.com \n\n b@example.com, c@example.com ",
    });
    expect(out.values).toEqual([["notification_recipients", ["a@example.com", "b@example.com", "c@example.com"]]]);
  });

  it("falls back to 0 for an unparseable number", () => {
    expect(parse([["duplicate_window_days", "number"]], { duplicate_window_days: "abc" }).values).toEqual([
      ["duplicate_window_days", 0],
    ]);
    expect(parse([["duplicate_window_days", "number"]], { duplicate_window_days: " 45 " }).values).toEqual([
      ["duplicate_window_days", 45],
    ]);
  });

  it("reads an unchecked checkbox as false", () => {
    expect(parse([["turnstile_enabled", "boolean"]], {}).values).toEqual([["turnstile_enabled", false]]);
    expect(parse([["turnstile_enabled", "boolean"]], { turnstile_enabled: "on" }).values).toEqual([
      ["turnstile_enabled", true],
    ]);
  });

  it("trims text values", () => {
    expect(parse([["notion_db_high_ticket", "text"]], { notion_db_high_ticket: "  ds:xyz  " }).values).toEqual([
      ["notion_db_high_ticket", "ds:xyz"],
    ]);
  });
});
