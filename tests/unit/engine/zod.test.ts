import { describe, expect, it } from "vitest";
import { validateAnswers } from "@/engine/zod-from-definition";
import { genericCscV1 } from "@/forms/canonical/generic_csc";
import { highTicketV1 } from "@/forms/canonical/high_ticket";
import { communityV1 } from "@/forms/canonical/community";

const validGeneric = {
  G01: "Amy", G02: "+852 9123 4567", G03: "Amy@Example.com ", G04: "Hong Kong",
  G05: "beauty", G06: "bottleneck", G07: "2_5", G08: ["leads_sales", "pricing_margin"], G09: "leads_sales",
  G10: "situation", G11: "goal", G12: "vision", G14: "2_5", G15: ["business_framework"],
  G17: "community", G18: "instagram", G19: { application: true }, G20: { marketing: false },
};

describe("generic_csc validation", () => {
  it("accepts a valid payload and normalizes email/phone", () => {
    const r = validateAnswers(genericCscV1.questions, validGeneric);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({});
    expect(r.data.G03).toBe("amy@example.com");
    expect(r.data.G02).toBe("+85291234567");
  });
  it("requires required fields", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G01: "  ", G10: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.G01).toBeTruthy();
    expect(r.errors.G10).toBeTruthy();
  });
  it("enforces maxSelections G08=3 and G15=2", () => {
    const r = validateAnswers(genericCscV1.questions, {
      ...validGeneric,
      G08: ["positioning", "brand_appeal", "leads_sales", "pricing_margin"],
      G15: ["talent_positioning", "brand_visual", "service_sop"],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.G08).toContain("3");
    expect(r.errors.G15).toContain("2");
  });
  it("rejects G09 value not among G08 selection", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G09: "sop_experience" });
    expect(r.ok).toBe(false);
    expect(r.errors.G09).toBeTruthy();
  });
  it("accepts 其他 in G09 even if not selected in G08", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G09: "other" });
    expect(r.ok).toBe(true);
  });
  it("rejects invalid phone and accepts TW / CN numbers", () => {
    expect(validateAnswers(genericCscV1.questions, { ...validGeneric, G02: "12345" }).errors.G02).toBeTruthy();
    expect(validateAnswers(genericCscV1.questions, { ...validGeneric, G02: "+886 912 345 678" }).data.G02).toBe("+886912345678");
    expect(validateAnswers(genericCscV1.questions, { ...validGeneric, G02: "+86 138 0013 8000" }).data.G02).toBe("+8613800138000");
    // HK local number without country code uses default HK
    expect(validateAnswers(genericCscV1.questions, { ...validGeneric, G02: "9123 4567" }).data.G02).toBe("+85291234567");
  });
  it("requires application consent, marketing optional", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G19: { application: false } });
    expect(r.ok).toBe(false);
    expect(r.errors.G19).toBeTruthy();
    const r2 = validateAnswers(genericCscV1.questions, { ...validGeneric, G20: undefined });
    expect(r2.ok).toBe(true);
    expect(r2.data.G20).toEqual({ marketing: false });
  });
  it("strips hidden and unknown keys", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G08: [], G09: "x", ZZZ: "junk" } as never);
    // G08 empty → required error; G09 hidden → no G09 error
    expect(r.errors.G08).toBeTruthy();
    expect(r.errors.G09).toBeUndefined();
  });
  it("caps long text length", () => {
    const r = validateAnswers(genericCscV1.questions, { ...validGeneric, G10: "x".repeat(5001) });
    expect(r.errors.G10).toBeTruthy();
  });
});

const validHT: Record<string, unknown> = {
  Q01: "Full Name", Q02: "Brand", Q03: "founder", Q04: "HK", Q05: "cantonese", Q06: "beauty", Q07: "1_3",
  Q08: "2_5", Q09: "1", Q10: "me", Q11: "growing_dependent", Q12: "undisclosed", Q13: ["founder_firefighting"],
  Q14: "a", Q15: "b", Q16: "5_10", Q17: "c", Q18: "d", Q19: "e", Q20: "me", Q21: "me", Q22: "2_5", Q23: 7,
  Q24: "single_diagnosis", Q25: "paid_diagnosis_first", Q26: "diagnose_prioritise", Q28: "x@y.com", Q29: "+85291234567",
  Q30: "", Q31: "instagram", Q32: { application: true }, Q33: { outcome_ack: true }, Q34: { marketing: false },
};

describe("high_ticket validation", () => {
  it("valid core payload", () => {
    const r = validateAnswers(highTicketV1.questions, validHT as never);
    expect(r.errors).toEqual({});
    expect(r.ok).toBe(true);
  });
  it("Q27 required only when Q24 = collaboration", () => {
    const r = validateAnswers(highTicketV1.questions, { ...validHT, Q24: "collaboration" } as never);
    expect(r.errors.Q27).toBeTruthy();
    const r2 = validateAnswers(highTicketV1.questions, { ...validHT, Q24: "collaboration", Q27: "details" } as never);
    expect(r2.ok).toBe(true);
  });
  it("Q30 url optional but validated; scheme added", () => {
    expect(validateAnswers(highTicketV1.questions, { ...validHT, Q30: "not a url at all" } as never).errors.Q30).toBeTruthy();
    expect(validateAnswers(highTicketV1.questions, { ...validHT, Q30: "instagram.com/carey" } as never).data.Q30).toBe("https://instagram.com/carey");
  });
  it("Q23 scale bounds and string coercion", () => {
    expect(validateAnswers(highTicketV1.questions, { ...validHT, Q23: 11 } as never).errors.Q23).toBeTruthy();
    expect(validateAnswers(highTicketV1.questions, { ...validHT, Q23: "3" } as never).data.Q23).toBe(3);
  });
  it("Q33 outcome acknowledgement required", () => {
    expect(validateAnswers(highTicketV1.questions, { ...validHT, Q33: {} } as never).errors.Q33).toBeTruthy();
  });
});

describe("community validation", () => {
  it("C07 application required, marketing optional", () => {
    const base = { C01: "A", C02: "beauty", C03: "bottleneck", C04: "leads_sales", C05: "more leads", C06: "all" };
    expect(validateAnswers(communityV1.questions, { ...base, C07: { application: false, marketing: true } }).errors.C07).toBeTruthy();
    const ok = validateAnswers(communityV1.questions, { ...base, C07: { application: true } });
    expect(ok.ok).toBe(true);
    expect(ok.data.C07).toEqual({ application: true, marketing: false });
  });
});
