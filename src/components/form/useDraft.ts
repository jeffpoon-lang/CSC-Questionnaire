"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Answers } from "@/engine/types";

/**
 * localStorage draft: `csc:draft:{slug}:{formVersionId}:{invite|public}`.
 * Saved (debounced) on every change, cleared on successful submit.
 */
export function useDraft(key: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((): { answers: Answers; startedAt: number } | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { answers?: Answers; startedAt?: number };
      if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
      return { answers: parsed.answers, startedAt: parsed.startedAt ?? Date.now() };
    } catch {
      return null;
    }
  }, [key]);

  const save = useCallback(
    (answers: Answers, startedAt: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify({ answers, startedAt, savedAt: Date.now() }));
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
