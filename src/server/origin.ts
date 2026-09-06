import "server-only";
import { headers } from "next/headers";
import { getEnv } from "@/db/client";

/**
 * The origin this request actually arrived on.
 *
 * `APP_ORIGIN` in wrangler.jsonc is the configured value, but on a fresh
 * deploy it is still a placeholder (the workers.dev subdomain is only known
 * after the first deploy). Reading the request instead means the app is
 * correct on the very first deploy, and the configured value is used only as
 * a fallback when no request headers are available.
 */
export async function requestOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

const PLACEHOLDER = /REPLACE_/;

/** Configured APP_ORIGIN, ignoring the un-edited placeholders. */
export async function configuredOrigin(): Promise<string | null> {
  const env = await getEnv();
  const v = env.APP_ORIGIN?.trim();
  if (!v || PLACEHOLDER.test(v)) return null;
  return v.replace(/\/$/, "");
}

/** Request origin first, configured value as fallback. */
export async function appOrigin(): Promise<string | null> {
  return (await requestOrigin()) ?? (await configuredOrigin());
}

/** Whether cookies should carry the Secure flag for this request. */
export async function isSecureRequest(): Promise<boolean> {
  const origin = (await requestOrigin()) ?? (await configuredOrigin());
  return origin?.startsWith("https://") ?? true;
}
