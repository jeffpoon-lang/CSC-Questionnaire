import { z } from "zod";

export const trackingSchema = z.object({
  source: z.string().max(100).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  landing_page: z.string().max(500).optional(),
  cta: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
});
export type Tracking = z.infer<typeof trackingSchema>;

export const TRACKING_KEYS = ["source", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "cta"] as const;

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s === "" ? undefined : s.slice(0, 500);
};

export function cleanTracking(t: Partial<Tracking>): Tracking {
  return {
    source: clean(t.source),
    utm_source: clean(t.utm_source),
    utm_medium: clean(t.utm_medium),
    utm_campaign: clean(t.utm_campaign),
    utm_term: clean(t.utm_term),
    utm_content: clean(t.utm_content),
    landing_page: clean(t.landing_page),
    cta: clean(t.cta),
    referrer: clean(t.referrer),
  };
}
