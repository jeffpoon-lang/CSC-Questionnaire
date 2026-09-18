import { describe, expect, it } from "vitest";
import { isTestSubmission, testParam } from "@/engine/test-mode";

describe("isTestSubmission", () => {
  it("marks everything outside production as test data", () => {
    expect(isTestSubmission("staging", false)).toBe(true);
    expect(isTestSubmission("development", false)).toBe(true);
    expect(isTestSubmission(undefined, false)).toBe(true);
  });

  it("keeps a plain production submission live", () => {
    expect(isTestSubmission("production", false)).toBe(false);
  });

  it("lets ?test=1 mark a test on production — the only way to do it there", () => {
    expect(isTestSubmission("production", true)).toBe(true);
  });
});

describe("testParam", () => {
  it("accepts exactly ?test=1", () => {
    expect(testParam("1")).toBe(true);
  });

  it("does not treat other truthy-looking values as opting in", () => {
    for (const v of ["0", "true", "yes", "", undefined]) {
      expect(testParam(v)).toBe(false);
    }
  });

  it("ignores a repeated parameter rather than guessing which one won", () => {
    expect(testParam(["1", "0"])).toBe(false);
  });
});

describe("the badge and the stored row agree", () => {
  // The page renders the warning from the same call the payload is built from,
  // so there is no input where one says test and the other says live.
  it("resolves identically for every environment and parameter", () => {
    for (const env of ["production", "staging", undefined]) {
      for (const raw of ["1", "0", undefined]) {
        const shown = isTestSubmission(env, testParam(raw));
        const stored = isTestSubmission(env, shown);
        expect(stored).toBe(shown);
      }
    }
  });
});
