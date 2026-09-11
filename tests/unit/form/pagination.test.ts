import { describe, expect, it } from "vitest";
import { PAGE_WEIGHT, paginate, pageOfQuestion, questionWeight, sectionList } from "@/components/form/pagination";
import { visibleQuestions } from "@/engine/visibility";
import { communityV1 } from "@/forms/canonical/community";
import { genericCscV1 } from "@/forms/canonical/generic_csc";
import { highTicketV1 } from "@/forms/canonical/high_ticket";
import type { Question } from "@/engine/types";

const q = (id: string, type: Question["type"], section?: string): Question =>
  ({ id, type, label: id, required: false, ...(section ? { section } : {}) }) as Question;

describe("paginate", () => {
  it("fills a page up to the weight limit", () => {
    const pages = paginate([q("a", "short_text"), q("b", "short_text"), q("c", "short_text"), q("d", "short_text")]);
    expect(pages.map((p) => p.questions.map((x) => x.id))).toEqual([["a", "b", "c"], ["d"]]);
  });

  it("counts a long_text double, so two essays never share a page", () => {
    expect(questionWeight(q("x", "long_text"))).toBe(2);
    const pages = paginate([q("a", "long_text"), q("b", "long_text")]);
    expect(pages).toHaveLength(2);
    const mixed = paginate([q("a", "short_text"), q("b", "long_text"), q("c", "short_text")]);
    expect(mixed.map((p) => p.questions.map((x) => x.id))).toEqual([["a", "b"], ["c"]]);
  });

  it("never crosses a section boundary", () => {
    const pages = paginate([q("a", "short_text", "一"), q("b", "short_text", "二"), q("c", "short_text")]);
    expect(pages.map((p) => p.section)).toEqual(["一", "二"]);
    expect(pages[1].questions.map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("keeps every question, exactly once, in order", () => {
    for (const def of [highTicketV1, genericCscV1, communityV1]) {
      const visible = visibleQuestions(def.questions, {});
      const flat = paginate(visible).flatMap((p) => p.questions.map((x) => x.id));
      expect(flat).toEqual(visible.map((x) => x.id));
    }
  });

  it("never exceeds the weight limit on a page", () => {
    const visible = visibleQuestions(highTicketV1.questions, {});
    for (const page of paginate(visible)) {
      expect(page.questions.reduce((n, x) => n + questionWeight(x), 0)).toBeLessThanOrEqual(PAGE_WEIGHT);
    }
  });

  it("reports the high-ticket shape: 7 sections, 1–3 questions per page", () => {
    const pages = paginate(visibleQuestions(highTicketV1.questions, {}));
    expect(sectionList(pages)).toEqual(["基本資料", "業務現況", "關鍵瓶頸", "問題代價", "決策與準備度", "聯絡方式", "同意"]);
    expect(pages.every((p) => p.questions.length >= 1 && p.questions.length <= 3)).toBe(true);
    expect(pageOfQuestion(pages, "Q01")).toBe(0);
    expect(pageOfQuestion(pages, "nope")).toBe(-1);
  });

  it("works for forms that declare no sections", () => {
    const pages = paginate(visibleQuestions(communityV1.questions, {}));
    expect(sectionList(pages)).toEqual([]);
    expect(pages.length).toBeGreaterThan(1);
  });

  it("places a conditional question on the page it belongs to once visible", () => {
    const withoutQ27 = paginate(visibleQuestions(highTicketV1.questions, {}));
    const withQ27 = paginate(visibleQuestions(highTicketV1.questions, { Q24: "collaboration" }));
    expect(pageOfQuestion(withoutQ27, "Q27")).toBe(-1);
    expect(pageOfQuestion(withQ27, "Q27")).toBeGreaterThan(-1);
    // Pages before the new question keep their position.
    expect(pageOfQuestion(withQ27, "Q01")).toBe(pageOfQuestion(withoutQ27, "Q01"));
    expect(pageOfQuestion(withQ27, "Q24")).toBe(pageOfQuestion(withoutQ27, "Q24"));
  });
});
