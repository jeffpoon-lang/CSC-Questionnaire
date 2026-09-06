import { evaluateCondition } from "./conditions";
import type { Answers, Cta, SuccessConfig } from "./types";

export interface ResolvedCta {
  label: string;
  href: string;
  style: "primary" | "secondary";
}

export interface ResolvedSuccess {
  headline: string;
  body?: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta[];
  notes: string[];
}

export type SettingsLookup = (key: string) => string | null | undefined;

function resolveHref(cta: Cta, settings: SettingsLookup): string | null {
  if (typeof cta.href === "string") return cta.href;
  const v = settings(cta.href.setting);
  return v && v.trim() !== "" ? v : null;
}

/**
 * Compute what the success page should show for a given submission.
 * CTAs whose setting is not configured resolve to href=null and are dropped,
 * so an unconfigured link never renders as a broken button.
 */
export function resolveSuccess(
  config: SuccessConfig,
  answers: Answers,
  settings: SettingsLookup,
): ResolvedSuccess {
  let primary: ResolvedCta | null = null;
  if (config.primaryCta) {
    const href = resolveHref(config.primaryCta, settings);
    if (href) primary = { label: config.primaryCta.label, href, style: "primary" };
  }

  const secondary: ResolvedCta[] = [];
  for (const s of config.secondary ?? []) {
    if (!evaluateCondition(s.when, answers)) continue;
    const href = resolveHref(s.cta, settings);
    if (!href) continue;
    secondary.push({ label: s.cta.label, href, style: s.cta.style ?? "secondary" });
  }

  const notes = (config.notes ?? [])
    .filter((n) => evaluateCondition(n.when, answers))
    .map((n) => n.text);

  return {
    headline: config.headline,
    body: config.body,
    primary,
    secondary,
    notes,
  };
}
