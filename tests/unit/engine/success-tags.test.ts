import { describe, expect, it } from "vitest";
import { resolveSuccess } from "@/engine/success";
import { extractTags } from "@/engine/tags";
import { genericCscV1 } from "@/forms/canonical/generic_csc";
import { communityV1 } from "@/forms/canonical/community";
import { highTicketV1 } from "@/forms/canonical/high_ticket";

const settings = (k: string) => ({ whatsapp_invite_url: "https://chat.whatsapp.com/abc", csc_info_url: "https://example.com/csc" })[k];

describe("success page resolution", () => {
  it("generic: community primary; CSC secondary only when G17=full_csc", () => {
    const a = resolveSuccess(genericCscV1.success, { G17: "community" }, settings);
    expect(a.primary?.href).toBe("https://chat.whatsapp.com/abc");
    expect(a.secondary).toHaveLength(0);
    expect(a.notes).toHaveLength(0);
    const b = resolveSuccess(genericCscV1.success, { G17: "full_csc" }, settings);
    expect(b.secondary[0].href).toBe("https://example.com/csc");
  });
  it("generic: diagnosis/advisory shows note only (no pricing / calendar)", () => {
    const r = resolveSuccess(genericCscV1.success, { G17: "advisory" }, settings);
    expect(r.notes[0]).toContain("團隊將先閱讀");
    expect(r.secondary).toHaveLength(0);
  });
  it("unconfigured setting drops the CTA instead of rendering a broken link", () => {
    const r = resolveSuccess(genericCscV1.success, { G17: "full_csc" }, () => null);
    expect(r.primary).toBeNull();
    expect(r.secondary).toHaveLength(0);
  });
  it("community: C06 branches", () => {
    expect(resolveSuccess(communityV1.success, { C06: "csc_info" }, settings).secondary[0].label).toContain("CSC");
    expect(resolveSuccess(communityV1.success, { C06: "diagnosis_advisory" }, settings).secondary[0].href).toBe("/f/high_ticket");
    expect(resolveSuccess(communityV1.success, { C06: "all" }, settings).secondary).toHaveLength(0);
  });
  it("high_ticket: message only", () => {
    const r = resolveSuccess(highTicketV1.success, {}, settings);
    expect(r.primary).toBeNull();
    expect(r.body).toContain("團隊會先閱讀");
  });
});

describe("extractTags", () => {
  it("collects select answers flagged tag:true, expanding multi-select", () => {
    const tags = extractTags(genericCscV1.questions, { G05: "beauty", G08: ["a", "b"], G10: "long text not tagged", G01: "name" });
    expect(tags).toEqual([
      { questionId: "G05", value: "beauty" },
      { questionId: "G08", value: "a" },
      { questionId: "G08", value: "b" },
    ]);
  });
  it("community C02–C06 are all tagged", () => {
    const tagged = communityV1.questions.filter((q) => q.tag).map((q) => q.id);
    expect(tagged).toEqual(["C02", "C03", "C04", "C06"]);
  });
});
