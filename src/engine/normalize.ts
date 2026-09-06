import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** Returns E.164 or null when not a valid number. */
export function normalizePhone(v: string, defaultCountry: string): string | null {
  const raw = v.trim();
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(
    raw,
    // libphonenumber expects a CountryCode; runtime accepts any string.
    defaultCountry as never,
  );
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function normalizeUrl(v: string): string | null {
  let s = v.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function normalizeText(v: string, maxLength?: number): string {
  const s = v.replace(/\r\n/g, "\n").trim();
  return typeof maxLength === "number" ? s.slice(0, maxLength) : s;
}
