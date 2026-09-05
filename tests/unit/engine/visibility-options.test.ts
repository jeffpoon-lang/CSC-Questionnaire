import { describe, expect, it } from "vitest";
import { resolveOptions } from "@/engine/options";
import { stripHiddenAnswers, visibleQuestions } from "@/engine/visibility";
import { genericCscV1 } from "@/forms/canonical/generic_csc";
import { highTicketV1 } from "@/forms/canonical/high_ticket";
import type { SingleSelectQuestion } from "@/engine/types";

const g09 = genericCscV1.questions.find((q) => q.id === "G09") as SingleSelectQuestion;

describe("G08 → G09 dynamic options", () => {
  it("G09 hidden when G08 empty", () => {
    const vis = visibleQuestions(genericCscV1.questions, {});
    expect(vis.map((q) => q.id)).not.toContain("G09");
  });
  it("G09 options = G08 selection + 其他, deduped", () => {
    const opts = resolveOptions(g09, { G08: ["leads_sales", "other"] }, genericCscV1.questions);
    expect(opts?.map((o) => o.value)).toEqual(["leads_sales", "other"]);
    expect(opts?.[0].label).toBe("客源與成交");
  });
  it("G09 visible once G08 has a selection", () => {
    const vis = visibleQuestions(genericCscV1.questions, { G08: ["positioning"] });
    expect(vis.map((q) => q.id)).toContain("G09");
  });
});

describe("Q24 → Q27 conditional", () => {
  it("Q27 hidden by default and shown when Q24 = collaboration", () => {
    expect(visibleQuestions(highTicketV1.questions, {}).map((q) => q.id)).not.toContain("Q27");
    expect(visibleQuestions(highTicketV1.questions, { Q24: "collaboration" }).map((q) => q.id)).toContain("Q27");
  });
  it("stripHiddenAnswers drops Q27 when hidden", () => {
    const out = stripHiddenAnswers(highTicketV1.questions, { Q24: "unsure", Q27: "should be dropped", Q01: "A" });
    expect(out).not.toHaveProperty("Q27");
    expect(out.Q01).toBe("A");
  });
});
