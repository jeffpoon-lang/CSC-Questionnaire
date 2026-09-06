"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { login, logout, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { isSecureRequest } from "@/server/origin";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (!email || !password) return { error: "請輸入電郵及密碼。" };
  const db = await getDb();
  const h = await headers();
  const r = await login(db, email, password, { ip: h.get("cf-connecting-ip"), userAgent: h.get("user-agent") });
  if (!r.ok) return { error: r.message };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, r.token, sessionCookieOptions(await isSecureRequest()));
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const db = await getDb();
  await logout(db, token);
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
