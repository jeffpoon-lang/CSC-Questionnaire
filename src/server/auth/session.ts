import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { adminUsers, sessions, type AdminUser } from "@/db/schema";
import { randomToken, sha256Hex } from "@/server/ids";
import { verifyPassword } from "./password";

export const SESSION_COOKIE = "csc_admin";
export const SESSION_TTL_MS = 14 * 86_400_000;
const REFRESH_AFTER_MS = 60 * 60_000;
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;

export type LoginResult = { ok: true; token: string; user: AdminUser } | { ok: false; message: string };

export async function login(db: Db, email: string, password: string, meta: { ip?: string | null; userAgent?: string | null }): Promise<LoginResult> {
  const generic = { ok: false as const, message: "電郵或密碼不正確。" };
  const e = email.trim().toLowerCase();
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, e)).limit(1);
  if (!user) {
    // burn similar time so user enumeration via timing is harder
    await verifyPassword(password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    return generic;
  }
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    return { ok: false, message: "嘗試次數過多，請 15 分鐘後再試。" };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedAttempts + 1;
    await db.update(adminUsers).set({ failedAttempts: failed, lockedUntil: failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MS) : null }).where(eq(adminUsers.id, user.id));
    return failed >= MAX_FAILED ? { ok: false, message: "嘗試次數過多，帳戶已暫時鎖定 15 分鐘。" } : generic;
  }
  const token = randomToken(32);
  const id = await sha256Hex(token);
  await db.batch([
    db.insert(sessions).values({ id, userId: user.id, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS), lastSeenAt: now, ipHash: meta.ip ? (await sha256Hex(meta.ip)).slice(0, 32) : null, userAgent: meta.userAgent?.slice(0, 300) ?? null }),
    db.update(adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now }).where(eq(adminUsers.id, user.id)),
    db.delete(sessions).where(lt(sessions.expiresAt, now)),
  ]);
  return { ok: true, token, user };
}

export async function getUserBySessionToken(db: Db, token: string | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const id = await sha256Hex(token);
  const now = new Date();
  const rows = await db
    .select({ session: sessions, user: adminUsers })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.userId, adminUsers.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (now.getTime() - row.session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    await db.update(sessions).set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) }).where(eq(sessions.id, id));
  }
  return row.user;
}

export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (!token) return;
  const id = await sha256Hex(token);
  await db.delete(sessions).where(eq(sessions.id, id));
}

export function sessionCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_MS / 1000 };
}
