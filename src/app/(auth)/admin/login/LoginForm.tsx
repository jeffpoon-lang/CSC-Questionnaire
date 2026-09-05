"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const input = "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-900";
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-medium text-stone-700">
        電郵
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        密碼
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-base font-medium text-white hover:bg-stone-800 disabled:opacity-60">
        {pending ? "登入中…" : "登入"}
      </button>
    </form>
  );
}
