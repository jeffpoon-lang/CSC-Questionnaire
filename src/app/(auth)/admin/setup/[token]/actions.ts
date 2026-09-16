"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { completeSetup } from "@/server/auth/setup";

export interface SetupState {
  error?: string;
}

export async function completeSetupAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password) return { error: "請輸入密碼。" };
  if (password !== confirm) return { error: "兩次輸入的密碼不相同。" };

  const db = await getDb();
  const result = await completeSetup(db, token, password);
  if (!result.ok) return { error: result.message };

  redirect("/admin/login?setup=done");
}
