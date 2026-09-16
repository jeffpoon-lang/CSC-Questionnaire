import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { adminUsers, type AdminUser } from "@/db/schema";
import { randomToken, sha256Hex } from "@/server/ids";
import { hashPassword, validatePasswordStrength } from "./password";
import { setupTokenExpiry, setupTokenState, type SetupTokenState } from "./setup-token";

/**
 * A pending account needs a password_hash (NOT NULL) that can never match.
 * verifyPassword rejects anything that is not `pbkdf2$<n>$<salt>$<hash>`, so
 * this fails closed: the account cannot be logged into until the link is used.
 */
const UNUSABLE_HASH = "!pending-setup";

export interface IssueSetupLinkInput {
  email: string;
  displayName: string;
  role: "owner" | "admin";
}

/** Returns the raw token — it is shown once, to be put in the link, and never stored. */
export async function issueSetupToken(db: Db, input: IssueSetupLinkInput, now = new Date()): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const token = randomToken(32);
  const setupTokenHash = await sha256Hex(token);
  const expires = setupTokenExpiry(now);

  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) {
    await db
      .update(adminUsers)
      .set({ setupTokenHash, setupTokenExpiresAt: expires, displayName: input.displayName, role: input.role })
      .where(eq(adminUsers.id, existing.id));
    return token;
  }

  await db.insert(adminUsers).values({
    id: `admin_${email.replace(/[^a-z0-9]/g, "_")}`,
    email,
    passwordHash: UNUSABLE_HASH,
    displayName: input.displayName,
    role: input.role,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    lastLoginAt: null,
    setupTokenHash,
    setupTokenExpiresAt: expires,
  });
  return token;
}

export async function findBySetupToken(db: Db, token: string, now = new Date()): Promise<{ state: SetupTokenState; user: AdminUser | null }> {
  if (!token) return { state: "not_found", user: null };
  const hash = await sha256Hex(token);
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.setupTokenHash, hash)).limit(1);
  const state = setupTokenState(user, now);
  return { state, user: state === "valid" ? user : null };
}

export type CompleteSetupResult = { ok: true; email: string } | { ok: false; message: string };

/**
 * Sets the password and consumes the link in one write. Also clears any lockout
 * left over from failed attempts against the pending account.
 */
export async function completeSetup(db: Db, token: string, password: string, now = new Date()): Promise<CompleteSetupResult> {
  const weak = validatePasswordStrength(password);
  if (weak) return { ok: false, message: weak };

  const { state, user } = await findBySetupToken(db, token, now);
  if (!user) {
    return {
      ok: false,
      message: state === "expired" ? "呢條設定連結已經過期。請聯絡管理員重新發出。" : "呢條設定連結無效或者已經使用過。",
    };
  }

  await db
    .update(adminUsers)
    .set({
      passwordHash: await hashPassword(password),
      setupTokenHash: null,
      setupTokenExpiresAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(adminUsers.id, user.id));

  return { ok: true, email: user.email };
}
