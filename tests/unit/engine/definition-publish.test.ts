import { describe, expect, it } from "vitest";
import { parseFormDefinition, parseModuleDefinition } from "@/engine/definition-schema";
import { checkPublishRules } from "@/engine/publish-rules";
import { mergeQuestions } from "@/engine/merge";
import { canonicalForms } from "@/forms/canonical";
import type { Question } from "@/engine/types";

describe("canonical definitions", () => {
  for (const [slug, def] of Object.entries(canonicalForms)) {
    it(`${slug} passes definition schema + lint`, () => {
      const r = parseFormDefinition(def);
      expect(r.issues).toEqual([]);
      expect(r.ok).toBe(true);
    });
  }
  it("question counts match the spec", () => {
    expect(canonicalForms.generic_csc.questions).toHaveLength(20);
    expect(canonicalForms.high_ticket.questions).toHaveLength(34);
    expect(canonicalForms.community.questions).toHaveLength(7);
  });
  it("ids are sequential and unique", () => {
    const ids = canonicalForms.high_ticket.questions.map((q) => q.id);
    expect(ids[0]).toBe("Q01");
    expect(ids[33]).toBe("Q34");
    expect(new Set(ids).size).toBe(34);
  });
  it("marketing consent defaults to false everywhere", () => {
    for (const def of Object.values(canonicalForms)) {
      for (const q of def.questions) {
        if (q.type !== "consent") continue;
        for (const item of q.items) if (item.key === "marketing") expect(item.default).toBe(false);
      }
    }
  });
});

describe("definition lint failures", () => {
  it("rejects duplicate ids and forward references", () => {
    const bad = {
      ...canonicalForms.community,
      questions: [
        { id: "C01", type: "short_text", label: "a", required: true, visibleIf: { questionId: "C02", op: "eq", value: "x" } },
        { id: "C01", type: "short_text", label: "b", required: true },
        ...canonicalForms.community.questions.slice(1),
      ],
    };
    const r = parseFormDefinition(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.includes("重複"))).toBe(true);
    expect(r.issues.some((i) => i.message.includes("前面"))).toBe(true);
  });
  it("rejects a form without required application consent", () => {
    const bad = { ...canonicalForms.community, questions: canonicalForms.community.questions.slice(0, 6) };
    expect(parseFormDefinition(bad).ok).toBe(false);
  });
});

describe("modules", () => {
  const mod = {
    schemaVersion: 1,
    slug: "team_diag",
    title: "團隊診斷補充",
    questions: [
      { id: "M_team_diag_01", type: "long_text", label: "x", required: true },
      { id: "M_team_diag_02", type: "single_select", label: "y", required: true, options: [{ value: "a", label: "A" }] },
    ],
  };
  it("valid module parses; wrong prefix rejected", () => {
    expect(parseModuleDefinition(mod).ok).toBe(true);
    const bad = { ...mod, questions: [{ id: "Q99", type: "short_text", label: "z", required: true }] };
    expect(parseModuleDefinition(bad).ok).toBe(false);
  });
  it("merge places module questions before the consent block", () => {
    const merged = mergeQuestions(canonicalForms.high_ticket, [mod as never]);
    const ids = merged.map((q) => q.id);
    expect(ids.indexOf("M_team_diag_01")).toBe(ids.indexOf("Q31") + 1);
    expect(ids.slice(-3)).toEqual(["Q32", "Q33", "Q34"]);
  });
});

describe("publish rules", () => {
  const v1: Question[] = [{ id: "G01", type: "short_text", label: "a", required: true }];
  it("type change on an existing id is rejected", () => {
    const next: Question[] = [{ id: "G01", type: "email", label: "a", required: true }];
    const r = checkPublishRules(next, [v1]);
    expect(r.errors).toHaveLength(1);
  });
  it("label change only warns", () => {
    const next: Question[] = [{ id: "G01", type: "short_text", label: "b", required: true }];
    const r = checkPublishRules(next, [v1]);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
  });
  it("reserved (module/core) ids collide", () => {
    const r = checkPublishRules(v1, [], new Set(["G01"]));
    expect(r.errors).toHaveLength(1);
  });
});
