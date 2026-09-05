import { describe, expect, it } from "vitest";
import { evaluateCondition, referencedQuestionIds } from "@/engine/conditions";
import type { Condition } from "@/engine/types";

describe("evaluateCondition", () => {
  const answers = { a: "x", b: ["p", "q"], n: 7, e: "", u: undefined };

  it("eq / neq", () => {
    expect(evaluateCondition({ questionId: "a", op: "eq", value: "x" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "a", op: "eq", value: "y" }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: "n", op: "eq", value: 7 }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "n", op: "eq", value: "7" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "a", op: "neq", value: "y" }, answers)).toBe(true);
  });
  it("in / notIn", () => {
    expect(evaluateCondition({ questionId: "a", op: "in", value: ["x", "z"] }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "a", op: "notIn", value: ["x"] }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: "b", op: "in", value: ["p"] }, answers)).toBe(false);
  });
  it("includes / notIncludes", () => {
    expect(evaluateCondition({ questionId: "b", op: "includes", value: "p" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "b", op: "notIncludes", value: "r" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "a", op: "includes", value: "x" }, answers)).toBe(true);
  });
  it("gte / lte", () => {
    expect(evaluateCondition({ questionId: "n", op: "gte", value: 7 }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "n", op: "lte", value: 6 }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: "a", op: "gte", value: 1 }, answers)).toBe(false);
  });
  it("empty / notEmpty", () => {
    expect(evaluateCondition({ questionId: "e", op: "empty" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "u", op: "empty" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "missing", op: "empty" }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: "b", op: "notEmpty" }, answers)).toBe(true);
  });
  it("all / any / not nesting", () => {
    const c: Condition = { all: [{ questionId: "a", op: "eq", value: "x" }, { any: [{ questionId: "n", op: "gte", value: 10 }, { not: { questionId: "e", op: "notEmpty" } }] }] };
    expect(evaluateCondition(c, answers)).toBe(true);
  });
  it("unknown question id is false for positive ops", () => {
    expect(evaluateCondition({ questionId: "zzz", op: "eq", value: "x" }, answers)).toBe(false);
  });
  it("referencedQuestionIds collects nested ids", () => {
    expect(referencedQuestionIds({ all: [{ questionId: "a", op: "empty" }, { not: { questionId: "b", op: "empty" } }] })).toEqual(["a", "b"]);
  });
});
