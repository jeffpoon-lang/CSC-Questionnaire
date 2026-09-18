/**
 * A submission is test data when it cannot be a real lead: anything outside
 * production, or an explicit `?test=1` on the link the person was handed.
 *
 * On production that query parameter is the only way to mark a test, so the
 * badge shown while filling the form and the row written to the database both
 * resolve through here — what the page promises is what gets stored.
 */
export function isTestSubmission(appEnv: string | undefined, explicit: boolean): boolean {
  return appEnv !== "production" || explicit;
}

/** Reads `?test=1`. A repeated parameter arrives as an array and never counts. */
export function testParam(value: string | string[] | undefined): boolean {
  return value === "1";
}
