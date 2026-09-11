"use client";

import type { AnswerValue, ConsentAnswer, Option, Question } from "@/engine/types";
import { DEFAULT_PII_HINT } from "@/engine/types";

export interface FieldProps {
  q: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  error?: string;
  options?: Option[];
  piiHintText?: string;
}

const inputCls =
  "mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 shadow-sm outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";
const errCls = "border-red-500 focus:border-red-600 focus:ring-red-600/10";

export function FieldShell({ q, error, children, piiHintText }: { q: Question; error?: string; children: React.ReactNode; piiHintText?: string }) {
  const showPii = q.type === "long_text" && q.piiHint;
  return (
    <div className="py-5" data-question={q.id}>
      <label htmlFor={q.id} className="block text-base font-medium leading-snug text-stone-900">
        {q.label}
        {q.required && <span className="ml-1 text-red-600" aria-hidden>*</span>}
      </label>
      {q.hint && <p className="mt-1 text-sm text-stone-500">{q.hint}</p>}
      {children}
      {showPii && <p className="mt-1.5 text-xs text-stone-400">{piiHintText ?? DEFAULT_PII_HINT}</p>}
      {error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert" id={`${q.id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ q, value, onChange, error, piiHintText }: FieldProps) {
  const v = typeof value === "string" ? value : "";
  const common = {
    id: q.id,
    name: q.id,
    value: v,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${q.id}-error` : undefined,
    className: `${inputCls} ${error ? errCls : ""}`,
  };
  return (
    <FieldShell q={q} error={error} piiHintText={piiHintText}>
      {q.type === "long_text" ? (
        <textarea {...common} rows={q.rows ?? 4} maxLength={q.maxLength ?? 5000} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : q.type === "url" ? "url" : "text"}
          inputMode={q.type === "phone" ? "tel" : q.type === "email" ? "email" : q.type === "url" ? "url" : "text"}
          autoComplete={q.type === "email" ? "email" : q.type === "phone" ? "tel" : q.type === "url" ? "url" : q.type === "short_text" ? "off" : undefined}
          maxLength={q.type === "short_text" ? (q.maxLength ?? 200) : undefined}
          placeholder={q.type === "short_text" ? q.placeholder : q.type === "url" ? "https://" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}

export function SingleSelectField({ q, value, onChange, error, options = [] }: FieldProps) {
  const v = typeof value === "string" ? value : "";
  if (q.type === "single_select" && q.layout === "dropdown") {
    return (
      <FieldShell q={q} error={error}>
        <select id={q.id} name={q.id} value={v} className={`${inputCls} ${error ? errCls : ""}`} onChange={(e) => onChange(e.target.value)}>
          <option value="">請選擇</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldShell>
    );
  }
  return (
    <FieldShell q={q} error={error}>
      <div role="radiogroup" aria-labelledby={q.id} className="mt-2 grid gap-2">
        {options.map((o) => {
          const checked = v === o.value;
          return (
            <label key={o.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-base ${checked ? "border-stone-900 bg-stone-900/5" : "border-stone-300 bg-white hover:border-stone-500"}`}>
              <input type="radio" name={q.id} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="h-4 w-4 accent-stone-900" />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function MultiSelectField({ q, value, onChange, error, options = [] }: FieldProps) {
  const arr = Array.isArray(value) ? value : [];
  const max = q.type === "multi_select" ? q.maxSelections : undefined;
  const toggle = (o: Option) => {
    if (arr.includes(o.value)) return onChange(arr.filter((x) => x !== o.value));
    if (o.exclusive) return onChange([o.value]);
    const base = arr.filter((x) => !options.find((p) => p.value === x)?.exclusive);
    if (typeof max === "number" && base.length >= max) return;
    onChange([...base, o.value]);
  };
  return (
    <FieldShell q={q} error={error}>
      <div className="mt-2 grid gap-2">
        {options.map((o) => {
          const checked = arr.includes(o.value);
          const disabled = !checked && typeof max === "number" && arr.length >= max;
          return (
            <label key={o.value} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-base ${checked ? "border-stone-900 bg-stone-900/5" : "border-stone-300 bg-white"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-stone-500"}`}>
              <input type="checkbox" name={q.id} value={o.value} checked={checked} disabled={disabled} onChange={() => toggle(o)} className="h-4 w-4 accent-stone-900" />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {typeof max === "number" && <p className="mt-1.5 text-xs text-stone-500">已選 {arr.length} / {max}</p>}
    </FieldShell>
  );
}

export function ScaleField({ q, value, onChange, error }: FieldProps) {
  if (q.type !== "scale") return null;
  const v = typeof value === "number" ? value : null;
  const nums = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i);
  return (
    <FieldShell q={q} error={error}>
      <div role="radiogroup" className="mt-2 flex flex-wrap gap-2">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={v === n}
            onClick={() => onChange(n)}
            className={`h-11 min-w-11 rounded-lg border text-base ${v === n ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"}`}
          >
            {n}
          </button>
        ))}
      </div>
      {(q.minLabel || q.maxLabel) && (
        <div className="mt-1.5 flex justify-between text-xs text-stone-500">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
      )}
    </FieldShell>
  );
}

export function ConsentField({ q, value, onChange, error }: FieldProps) {
  if (q.type !== "consent") return null;
  const v = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as ConsentAnswer;
  return (
    <FieldShell q={q} error={error}>
      <div className="mt-2 grid gap-3">
        {q.items.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name={`${q.id}.${item.key}`}
              checked={Boolean(v[item.key])}
              onChange={(e) => onChange({ ...v, [item.key]: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-stone-900"
            />
            <span>
              {item.label}
              {item.required && <span className="ml-1 text-red-600">*</span>}
              {item.link && (
                <>
                  {" "}
                  <a href={item.link.href} target="_blank" rel="noopener noreferrer" className="underline">
                    {item.link.label}
                  </a>
                </>
              )}
            </span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}
