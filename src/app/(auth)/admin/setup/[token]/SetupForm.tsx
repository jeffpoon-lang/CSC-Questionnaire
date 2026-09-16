"use client";

import { useActionState } from "react";
import { completeSetupAction, type SetupState } from "./actions";

export function SetupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(completeSetupAction, {});
  const input = "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-900";

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-medium text-stone-700">
        新密碼
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className={input} />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        再輸入一次
        <input name="confirm" type="password" autoComplete="new-password" required minLength={12} className={input} />
      </label>
      <p className="text-xs text-stone-500">最少 12 個字元。設定後只有你知道；系統不會以任何方式顯示或寄出。</p>
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-base font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "設定中…" : "設定密碼"}
      </button>
    </form>
  );
}
