"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Answers } from "@/engine/types";

export interface DraftState {
  answers: Answers;
  startedAt: number;
  /** Page the respondent was on, so a resumed draft reopens where it stopped. */
  page: number;
}

/**
 * localStorage draft: `csc:draft:{slug}:{formVersionId}:{invite|public}`.
 * Saved (debounced) on every change, cleared on successful submit.
 */
export function useDraft(key: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((): DraftState | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { answers?: Answers; startedAt?: number; page?: number };
      if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
      return {
        answers: parsed.answers,
        startedAt: parsed.startedAt ?? Date.now(),
        page: typeof parsed.page === "number" && parsed.page >= 0 ? parsed.page : 0,
      };
    } catch {
      return null;
    }
  }, [key]);

  const save = useCallback(
    (answers: Answers, startedAt: number, page: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify({ answers, startedAt, page, savedAt: Date.now() }));
        } catch {
          /* quota / private mode */
        }
      }, 400);
    },
    [key],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { load, save, clear };
}
