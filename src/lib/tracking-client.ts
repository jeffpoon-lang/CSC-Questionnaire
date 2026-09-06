"use client";

import type { Tracking } from "@/server/tracking";

const KEY = "csc:tracking";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "source", "src", "cta"] as const;

/**
 * Capture tracking params on first landing and remember them in sessionStorage
 * so a visitor who arrives on `/` or a sales page and later opens a form
 * still carries the original attribution.
 */
export function captureTracking(): Tracking {
  if (typeof window === "undefined") return {};
  let stored: Tracking = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Tracking;
  } catch {
    stored = {};
  }
  const params = new URLSearchParams(window.location.search);
  const fresh: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) fresh[k === "src" ? "source" : k] = v;
  }
  const next: Tracking = {
    ...stored,
    ...fresh,
    landing_page: stored.landing_page ?? window.location.pathname + window.location.search,
    referrer: stored.referrer ?? (document.referrer || undefined),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
