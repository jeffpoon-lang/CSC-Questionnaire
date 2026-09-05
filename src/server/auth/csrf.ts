import "server-only";

/**
 * Same-origin check for state-changing /api/admin handlers.
 * (Server Actions already get Next's built-in Origin/Host check.)
 */
export function assertSameOrigin(request: Request, appOrigin: string): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  if (origin) {
    try {
      const o = new URL(origin);
      const a = new URL(appOrigin);
      const reqHost = request.headers.get("host");
      return o.host === a.host || (reqHost !== null && o.host === reqHost);
    } catch {
      return false;
    }
  }
  return true;
}
