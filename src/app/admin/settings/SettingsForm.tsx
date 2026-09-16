"use client";

import { useActionState } from "react";
import { btnCls, inputCls } from "@/components/admin/ui";
import { saveSettingsAction, type SettingsState } from "./actions";

export interface SettingsField {
  key: string;
  label: string;
  hint: string;
  kind: "url" | "text" | "list" | "number" | "boolean";
  value: string;
  checked: boolean;
}

export function SettingsForm({ fields }: { fields: SettingsField[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  const invalid = new Set<string>(state.invalidKeys ?? []);

  return (
    <form action={action} className="space-y-5">
      {fields.map((f) => (
        <div key={f.key} className="grid gap-1 sm:grid-cols-3">
          <label htmlFor={f.key} className="text-sm font-medium text-stone-800">
            {f.label}
            <span className="block font-mono text-xs font-normal text-stone-400">{f.key}</span>
          </label>
          <div className="sm:col-span-2">
            {f.kind === "boolean" ? (
              <input id={f.key} name={f.key} type="checkbox" defaultChecked={f.checked} className="h-4 w-4 accent-stone-900" />
            ) : f.kind === "list" ? (
              <textarea id={f.key} name={f.key} rows={3} defaultValue={f.value} className={`${inputCls} w-full`} />
            ) : (
              <input
                id={f.key}
                name={f.key}
                type={f.kind === "number" ? "number" : "text"}
                defaultValue={f.value}
                aria-invalid={invalid.has(f.key) || undefined}
                className={`${inputCls} w-full ${invalid.has(f.key) ? "border-red-500" : ""}`}
              />
            )}
            {f.hint && <p className="mt-1 text-xs text-stone-500">{f.hint}</p>}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "儲存中…" : "儲存設定"}
        </button>
        <p aria-live="polite" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
