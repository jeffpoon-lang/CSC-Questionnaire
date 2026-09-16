/**
 * Rules for the one-time link that lets an admin set their own password.
 *
 * Kept pure and separate from the database so expiry and single-use are
 * decided in one place, and so the states a visitor can land in are covered by
 * unit tests rather than by clicking a real link.
 *
 * The owner's password must never be known to anyone else — that is what the
 * handover's "operates the system independently" rests on — so the link sets a
 * password rather than carrying one.
 */

export const SETUP_TOKEN_TTL_MS = 7 * 86_400_000;

export type SetupTokenState = "valid" | "not_found" | "expired";

export interface SetupTokenRow {
  setupTokenHash: string | null;
  setupTokenExpiresAt: Date | null;
}

export function setupTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + SETUP_TOKEN_TTL_MS);
}

/**
 * `row` is whatever the lookup by token hash returned. A consumed link clears
 * the hash, so a used link and an unknown one are deliberately indistinguishable.
 */
export function setupTokenState(row: SetupTokenRow | null | undefined, now: Date): SetupTokenState {
  if (!row || !row.setupTokenHash) return "not_found";
  if (!row.setupTokenExpiresAt || row.setupTokenExpiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function setupStateMessage(state: Exclude<SetupTokenState, "valid">): string {
  return state === "expired"
    ? "呢條設定連結已經過期。請聯絡管理員重新發出。"
    : "呢條設定連結無效或者已經使用過。請聯絡管理員重新發出。";
}
