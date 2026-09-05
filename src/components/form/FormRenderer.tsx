"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveOptions } from "@/engine/options";
import type { AnswerValue, Answers, Question } from "@/engine/types";
import { isSelect } from "@/engine/types";
import { visibleQuestions } from "@/engine/visibility";
import { validateAnswers } from "@/engine/zod-from-definition";
import { captureTracking } from "@/lib/tracking-client";
import { QuestionField } from "./QuestionField";
import { useDraft } from "./useDraft";

export interface FormRendererProps {
  slug: string;
  formVersionId: string;
  title: string;
  intro?: string;
  submitLabel?: string;
  estimatedMinutes?: string;
  questions: Question[];
  piiHintText?: string;
  honeypot: boolean;
  inviteToken?: string;
  /** Answers pre-filled from the URL / invite (applied only when no draft). */
  prefill?: Answers;
  turnstileSiteKey?: string | null;
  isTestEnv: boolean;
}

interface SubmitResponse {
  ok: boolean;
  redirect?: string;
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

export function FormRenderer(props: FormRendererProps) {
  const router = useRouter();
  const draftKey = `csc:draft:${props.slug}:${props.formVersionId}:${props.inviteToken ? `invite:${props.inviteToken}` : "public"}`;
  const draft = useDraft(draftKey);

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const startedAt = useRef<number>(0);
  const trackingRef = useRef<ReturnType<typeof captureTracking>>({});

  // Hydrate: draft > prefill. localStorage is only available after mount, so
  // this must run in an effect (SSR renders an empty form first).
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    trackingRef.current = captureTracking();
    startedAt.current = Date.now();
    const d = draft.load();
    if (d && Object.keys(d.answers).length > 0) {
      setAnswers(d.answers);
      startedAt.current = d.startedAt;
      setRestored(true);
    } else if (props.prefill && Object.keys(props.prefill).length > 0) {
      setAnswers(props.prefill);
    }
    setHydrated(true);
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (hydrated) draft.save(answers, startedAt.current);
  }, [answers, hydrated, draft]);

  const visible = useMemo(() => visibleQuestions(props.questions, answers), [props.questions, answers]);

  const onChange = useCallback((id: string, v: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const scrollToFirstError = (errs: Record<string, string>) => {
    const first = visible.find((q) => errs[q.id]);
    if (!first) return;
    const el = document.querySelector(`[data-question="${first.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerMessage(null);
    const v = validateAnswers(props.questions, answers);
    if (!v.ok) {
      setErrors(v.errors);
      scrollToFirstError(v.errors);
      return;
    }
    setSubmitting(true);
    try {
      const turnstileToken = (document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value;
      const res = await fetch(`/api/f/${props.slug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: v.data,
          meta: {
            formVersionId: props.formVersionId,
            inviteToken: props.inviteToken,
            startedAt: startedAt.current,
            tracking: trackingRef.current,
            test: props.isTestEnv || new URLSearchParams(window.location.search).get("test") === "1",
          },
          hp,
          turnstileToken,
        }),
      });
      const json = (await res.json()) as SubmitResponse;
      if (json.ok && json.redirect) {
        draft.clear();
        router.push(json.redirect);
        return;
      }
      if (json.errors) {
        setErrors(json.errors);
        scrollToFirstError(json.errors);
      }
      setServerMessage(json.message ?? "提交失敗，請稍後再試。");
      if (json.code === "version_stale") {
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch {
      setServerMessage("網絡錯誤，請檢查連線後再試。你的答案已自動保存。");
    } finally {
      setSubmitting(false);
    }
  };

  const total = visible.filter((q) => q.type !== "consent").length;
  const answered = visible.filter((q) => {
    if (q.type === "consent") return false;
    const v = answers[q.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-2xl px-5 pb-24 pt-10 sm:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">{props.title}</h1>
        {props.intro && <p className="mt-3 text-base leading-relaxed text-stone-600">{props.intro}</p>}
        {props.estimatedMinutes && <p className="mt-2 text-sm text-stone-500">預計約 {props.estimatedMinutes} 分鐘</p>}
        {props.isTestEnv && (
          <p className="mt-3 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">TEST 環境：提交會標記為測試資料</p>
        )}
      </header>

      {restored && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
          <span>已還原你上次未完成的答案。</span>
          <button type="button" className="underline" onClick={() => { draft.clear(); setAnswers(props.prefill ?? {}); setRestored(false); }}>
            清除重新開始
          </button>
        </div>
      )}

      <div className="divide-y divide-stone-200">
        {visible.map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            answers={answers}
            options={isSelect(q) ? (resolveOptions(q, answers, props.questions) ?? []) : undefined}
            error={errors[q.id]}
            onChange={onChange}
            piiHintText={props.piiHintText}
          />
        ))}
      </div>

      {props.honeypot && (
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </label>
        </div>
      )}

      {props.turnstileSiteKey && (
        <>
          <div className="cf-turnstile mt-4" data-sitekey={props.turnstileSiteKey} />
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        </>
      )}

      {serverMessage && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverMessage}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 mt-6 border-t border-stone-200 bg-stone-50/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-stone-500">{answered} / {total} 題 · 答案會自動保存在此裝置</span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60"
          >
            {submitting ? "提交中…" : (props.submitLabel ?? "提交")}
          </button>
        </div>
      </div>
    </form>
  );
}
