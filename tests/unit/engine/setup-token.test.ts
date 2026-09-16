import { describe, expect, it } from "vitest";
import {
  SETUP_TOKEN_TTL_MS,
  setupStateMessage,
  setupTokenExpiry,
  setupTokenState,
  type SetupTokenRow,
} from "@/server/auth/setup-token";

const now = new Date("2026-09-16T12:00:00Z");
const row = (over: Partial<SetupTokenRow> = {}): SetupTokenRow => ({
  setupTokenHash: "abc",
  setupTokenExpiresAt: new Date(now.getTime() + 60_000),
  ...over,
});

describe("setupTokenState", () => {
  it("accepts a token that exists and has not expired", () => {
    expect(setupTokenState(row(), now)).toBe("valid");
  });

  it("treats a consumed link the same as an unknown one", () => {
    expect(setupTokenState(row({ setupTokenHash: null }), now)).toBe("not_found");
    expect(setupTokenState(null, now)).toBe("not_found");
    expect(setupTokenState(undefined, now)).toBe("not_found");
  });

  it("rejects an expired link", () => {
    expect(setupTokenState(row({ setupTokenExpiresAt: new Date(now.getTime() - 1) }), now)).toBe("expired");
  });

  it("rejects a link expiring exactly now", () => {
    expect(setupTokenState(row({ setupTokenExpiresAt: new Date(now.getTime()) }), now)).toBe("expired");
  });

  it("rejects a row with no expiry rather than treating it as forever", () => {
    expect(setupTokenState(row({ setupTokenExpiresAt: null }), now)).toBe("expired");
  });
});

describe("setupTokenExpiry", () => {
  it("expires one TTL after issue", () => {
    expect(setupTokenExpiry(now).getTime()).toBe(now.getTime() + SETUP_TOKEN_TTL_MS);
  });

  it("stays a matter of days, not months", () => {
    const days = SETUP_TOKEN_TTL_MS / 86_400_000;
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(14);
  });
});

describe("setupStateMessage", () => {
  it("says so plainly when the link expired", () => {
    expect(setupStateMessage("expired")).toContain("過期");
  });

  it("does not reveal whether the account exists", () => {
    const msg = setupStateMessage("not_found");
    expect(msg).toContain("無效");
    expect(msg).not.toContain("帳戶不存在");
  });
});
