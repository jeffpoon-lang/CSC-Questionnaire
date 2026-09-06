import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { AdminUser } from "@/db/schema";
import { getUserBySessionToken, SESSION_COOKIE } from "./session";

export async function currentAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  return getUserBySessionToken(db, token);
}

/** Use in every admin page, layout, server action and /api/admin handler. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}

export class UnauthorizedError extends Error {}

/** For route handlers: returns 401 instead of redirecting. */
export async function requireAdminApi(): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) throw new UnauthorizedError("unauthorized");
  return user;
}
