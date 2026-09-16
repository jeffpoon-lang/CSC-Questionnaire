import Link from "next/link";
import { getDb } from "@/db/client";
import { findBySetupToken } from "@/server/auth/setup";
import { setupStateMessage } from "@/server/auth/setup-token";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const { state, user } = await findBySetupToken(db, token);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-xl font-semibold text-stone-900">設定 CSC Admin 密碼</h1>
      {user ? (
        <>
          <p className="mt-2 text-sm text-stone-600">
            帳戶：<span className="font-medium text-stone-900">{user.email}</span>
          </p>
          <SetupForm token={token} />
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-red-600" role="alert">
            {setupStateMessage(state === "valid" ? "not_found" : state)}
          </p>
          <Link href="/admin/login" className="mt-4 text-sm text-stone-900 underline">
            前往登入頁
          </Link>
        </>
      )}
    </main>
  );
}
