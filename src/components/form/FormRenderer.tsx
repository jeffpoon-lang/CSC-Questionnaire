"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveOptions } from "@/engine/options";
import type { AnswerValue, Answers, Question } from "@/engine/types";
import { isSelect } from "@/engine/types";
import { visibleQuestions } from "@/engine/visibility";
import { validateAnswers } from "@/engine/zod-from-definition";
import { captureTracking } from "@/lib/tracking-client";
import { paginate, pageOfQuestion, sectionList } from "./pagination";
import { QuestionField } from "./QuestionField";
import { ReviewStep } from "./ReviewStep";
import { StepProgress } from "./StepProgress";
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
  /** Admin preview: renders + validates but never submits or saves drafts. */
  previewOnly?: boolean;
}

interface SubmitResponse {
  ok: boolean;
  redirect?: string;
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

/** How long the outgoing page fades before the next one mounts. */
const EXIT_MS = 180;
/** Pause after a one-question page is answered, before it advances itself. */
const AUTO_ADVANCE_MS = 320;

type Cursor =
  | { kind: "intro" }
  /** Anchored on the page's question ids so conditional questions can't shift it. */
  | { kind: "page"; ids: string[]; fallback: number }
  | { kind: "review" };

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
  const [cursor, setCursor] = useState<Cursor>({ kind: "intro" });
  const [dir, setDir] = useState<1 | -1>(1);
  const [exiting, setExiting] = useState(false);
  /** Set when a question was opened from the review list, so it returns there. */
  const [fromReview, setFromReview] = useState(false);

  const startedAt = useRef<number>(0);
  const trackingRef = useRef<ReturnType<typeof captureTracking>>({});
  const stepRef = useRef<HTMLDivElement>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calmRef = useRef(false);
  /** Question to reveal once the next step has mounted (review "修改", errors). */
  const focusRef = useRef<string | null>(null);

  // Hydrate: draft > prefill. localStorage is only available after mount, so
  // this must run in an effect (SSR renders the intro step first).
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    trackingRef.current = captureTracking();
    startedAt.current = Date.now();
    calmRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = props.previewOnly ? null : draft.load();
    if (d && Object.keys(d.answers).length > 0) {
      setAnswers(d.answers);
      startedAt.current = d.startedAt;
      setRestored(true);
      // Resume on the page they left, not back at the intro.
      setCursor({ kind: "page", ids: [], fallback: d.page });
    } else if (props.prefill && Object.keys(props.prefill).length > 0) {
      setAnswers(props.prefill);
    }
    setHydrated(true);
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  const visible = useMemo(() => visibleQuestions(props.questions, answers), [props.questions, answers]);
  const pages = useMemo(() => paginate(visible), [visible]);
  const sections = useMemo(() => sectionList(pages), [pages]);
  const lastPage = pages.length - 1;

  /** Current page index; -1 on the intro and review steps. */
  const pageIndex = useMemo(() => {
    if (cursor.kind !== "page" || pages.length === 0) return -1;
    for (const id of cursor.ids) {
      const i = pageOfQuestion(pages, id);
      if (i >= 0) return i;
    }
    return Math.min(Math.max(cursor.fallback, 0), lastPage);
  }, [cursor, pages, lastPage]);

  const onReview = cursor.kind === "review";
  const step = cursor.kind === "intro" ? 0 : onReview ? pages.length + 1 : pageIndex + 1;
  const stepKey = cursor.kind === "intro" ? "intro" : onReview ? "review" : `p${pageIndex}`;

  useEffect(() => {
    if (hydrated && !props.previewOnly) draft.save(answers, startedAt.current, Math.max(pageIndex, 0));
  }, [answers, hydrated, draft, props.previewOnly, pageIndex]);

  // Move focus (and the viewport) after each step change.
  useEffect(() => {
    if (!hydrated || exiting) return;
    const behavior: ScrollBehavior = calmRef.current ? "auto" : "smooth";
    const target = focusRef.current;
    focusRef.current = null;
    if (target) {
      const el = document.querySelector(`[data-question="${target}"]`);
      el?.scrollIntoView({ behavior, block: "center" });
      el?.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
      return;
    }
    window.scrollTo({ top: 0, behavior });
    stepRef.current?.focus({ preventScroll: true });
  }, [stepKey, hydrated, exiting]);

  const goTo = useCallback(
    (next: Cursor, direction: 1 | -1, focusId?: string) => {
      if (exiting) return;
      if (autoTimer.current) clearTimeout(autoTimer.current);
      setRestored(false);
      setDir(direction);
      setExiting(true);
      navTimer.current = setTimeout(() => {
        focusRef.current = focusId ?? null;
        setCursor(next);
        setExiting(false);
      }, calmRef.current ? 0 : EXIT_MS);
    },
    [exiting],
  );

  const cursorForPage = useCallback(
    (i: number): Cursor => ({ kind: "page", ids: pages[i]?.questions.map((q) => q.id) ?? [], fallback: i }),
    [pages],
  );

  const scrollToFirstError = (errs: Record<string, string>, scope: Question[]) => {
    const first = scope.find((q) => errs[q.id]);
    if (!first) return;
    const el = document.querySelector(`[data-question="${first.id}"]`);
    el?.scrollIntoView({ behavior: calmRef.current ? "auto" : "smooth", block: "center" });
  };

  /** Validate only the questions on the current page. */
  const validateCurrentPage = (): boolean => {
    if (pageIndex < 0) return true;
    const scope = pages[pageIndex].questions;
    const ids = new Set(scope.map((q) => q.id));
    const all = validateAnswers(props.questions, answers);
    const pageErrors: Record<string, string> = {};
    for (const [id, msg] of Object.entries(all.errors)) {
      if (ids.has(id)) pageErrors[id] = msg;
    }
    setErrors(pageErrors);
    if (Object.keys(pageErrors).length > 0) {
      scrollToFirstError(pageErrors, scope);
      return false;
    }
    return true;
  };

  /** Move forward without validating (the caller has already decided it may). */
  const advance = useCallback(() => {
    if (cursor.kind === "intro") {
      goTo(pages.length > 0 ? cursorForPage(0) : { kind: "review" }, 1);
      return;
    }
    if (onReview) return;
    const returning = fromReview;
    setFromReview(false);
    if (returning || pageIndex >= lastPage) goTo({ kind: "review" }, 1);
    else goTo(cursorForPage(pageIndex + 1), 1);
  }, [cursor, onReview, fromReview, pageIndex, lastPage, pages, goTo, cursorForPage]);

  const goNext = () => {
    if (cursor.kind === "page" && !validateCurrentPage()) return;
    advance();
  };

  const goBack = useCallback(() => {
    setFromReview(false);
    if (onReview) {
      goTo(pages.length > 0 ? cursorForPage(lastPage) : { kind: "intro" }, -1);
      return;
    }
    if (pageIndex <= 0) goTo({ kind: "intro" }, -1);
    else goTo(cursorForPage(pageIndex - 1), -1);
  }, [onReview, pageIndex, lastPage, pages, goTo, cursorForPage]);

  const editFromReview = (questionId: string) => {
    const i = pageOfQuestion(pages, questionId);
    if (i < 0) return;
    setFromReview(true);
    goTo(cursorForPage(i), -1, questionId);
  };

  const onChange = useCallback(
    (id: string, v: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [id]: v }));
      setErrors((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // A page holding a single choice question advances itself once answered.
      const page = pageIndex >= 0 ? pages[pageIndex] : null;
      const q = page?.questions.length === 1 ? page.questions[0] : null;
      if (!q || q.id !== id) return;
      const picked = q.type === "single_select" ? typeof v === "string" && v !== "" : q.type === "scale" && typeof v === "number";
      if (!picked) return;
      // The answer is valid by construction, so this skips page validation
      // (which would still be reading the pre-change answers anyway).
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => advance(), AUTO_ADVANCE_MS);
    },
    [pageIndex, pages, advance],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter inside a field means "next page" until the review step.
    if (!onReview) {
      goNext();
      return;
    }
    setServerMessage(null);
    const v = validateAnswers(props.questions, answers);
    if (!v.ok) {
      setErrors(v.errors);
      const firstBad = visible.find((q) => v.errors[q.id]);
      if (firstBad) {
        const i = pageOfQuestion(pages, firstBad.id);
        setServerMessage("有題目未填妥，已帶你返回該題。");
        if (i >= 0) goTo(cursorForPage(i), -1, firstBad.id);
      }
      return;
    }
    if (props.previewOnly) {
      setServerMessage("預覽模式：驗證通過，未有提交。");
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
        const firstBad = visible.find((q) => json.errors?.[q.id]);
        const i = firstBad ? pageOfQuestion(pages, firstBad.id) : -1;
        if (i >= 0 && firstBad) goTo(cursorForPage(i), -1, firstBad.id);
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

  const activeSection = cursor.kind === "intro" ? -1 : onReview ? sections.length : sections.indexOf(pages[pageIndex]?.section ?? "");
  const progressLabel = cursor.kind === "intro" ? "開始之前" : onReview ? "檢視答案" : (pages[pageIndex]?.section || props.title);
  const progressCaption = cursor.kind === "intro" ? "簡介" : onReview ? "最後一步" : `第 ${pageIndex + 1} ／ ${pages.length} 頁`;
  const percent = pages.length === 0 ? 100 : Math.round((step / (pages.length + 1)) * 100);
  const nextLabel = cursor.kind === "intro"
    ? "開始填寫"
    : fromReview
      ? "返回檢視"
      : pageIndex >= lastPage
        ? "檢視答案"
        : "下一步";
  const stepClass = exiting
    ? dir > 0 ? "step-exit-fwd" : "step-exit-back"
    : dir > 0 ? "step-enter-fwd" : "step-enter-back";

  return (
    <form onSubmit={onSubmit} noValidate>
      <StepProgress
        label={progressLabel}
        caption={progressCaption}
        percent={percent}
        sections={sections}
        activeSection={activeSection}
      />

      <div className="mx-auto w-full max-w-2xl px-5 pb-32 pt-8 sm:px-8">
        {restored && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
            <span>已還原你上次未完成的答案。</span>
            <button
              type="button"
              className="underline"
              onClick={() => { draft.clear(); setAnswers(props.prefill ?? {}); setRestored(false); setCursor({ kind: "intro" }); }}
            >
              清除重新開始
            </button>
          </div>
        )}

        <div key={stepKey} ref={stepRef} tabIndex={-1} className={`outline-none ${stepClass}`}>
          {cursor.kind === "intro" && (
            <>
              <header style={{ "--step-i": 0 } as React.CSSProperties}>
                <h1 className="text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">{props.title}</h1>
                {props.intro && <p className="mt-3 text-base leading-relaxed text-stone-600">{props.intro}</p>}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-500">
                  {props.estimatedMinutes && <span>預計約 {props.estimatedMinutes} 分鐘</span>}
                  <span>共 {pages.length} 頁，每頁 1–3 題</span>
                  <span>中途離開，答案會保留</span>
                </div>
                {props.previewOnly ? (
                  <p className="mt-3 inline-block rounded bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">預覽模式：不會提交或保存草稿</p>
                ) : props.isTestEnv && (
                  <p className="mt-3 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">TEST 環境：提交會標記為測試資料</p>
                )}
              </header>

              {sections.length > 1 && (
                <ol style={{ "--step-i": 1 } as React.CSSProperties} className="mt-6 border-t border-stone-200">
                  {sections.map((s, i) => (
                    <li key={s} className="flex items-baseline gap-3 border-b border-stone-200 py-2.5">
                      <span className="text-xs tabular-nums text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 text-base text-stone-800">{s}</span>
                      <span className="text-xs tabular-nums text-stone-500">
                        {visible.filter((q) => pages.some((p) => p.section === s && p.questions.includes(q))).length} 題
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {cursor.kind === "page" && pageIndex >= 0 && (
            <div className="divide-y divide-stone-200">
              {pages[pageIndex].questions.map((q, i) => (
                <div key={q.id} style={{ "--step-i": i } as React.CSSProperties}>
                  <QuestionField
                    q={q}
                    answers={answers}
                    options={isSelect(q) ? (resolveOptions(q, answers, props.questions) ?? []) : undefined}
                    error={errors[q.id]}
                    onChange={onChange}
                    piiHintText={props.piiHintText}
                  />
                </div>
              ))}
            </div>
          )}

          {onReview && (
            <div style={{ "--step-i": 0 } as React.CSSProperties}>
              <ReviewStep
                questions={visible}
                allQuestions={props.questions}
                answers={answers}
                errors={errors}
                onEdit={editFromReview}
              />
              {props.turnstileSiteKey && (
                <>
                  <div className="cf-turnstile mt-4" data-sitekey={props.turnstileSiteKey} />
                  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                </>
              )}
            </div>
          )}
        </div>

        {props.honeypot && (
          <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
            </label>
          </div>
        )}

        {serverMessage && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {serverMessage}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <span className="text-xs text-stone-500">
            {cursor.kind === "intro" ? "答案會自動保存在此裝置" : `${answered} / ${total} 題 · 自動保存`}
          </span>
          <span className="flex items-center gap-2">
            {cursor.kind !== "intro" && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-stone-300 px-4 py-2.5 text-base text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
              >
                上一步
              </button>
            )}
            {onReview ? (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60"
              >
                {submitting ? "提交中…" : (props.submitLabel ?? "提交")}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-stone-800"
              >
                {nextLabel}
              </button>
            )}
          </span>
        </div>
      </div>
    </form>
  );
}
