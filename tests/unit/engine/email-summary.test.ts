import { describe, expect, it } from "vitest";
import { genericCscV1 } from "@/forms/canonical/generic_csc";
import { highTicketV1 } from "@/forms/canonical/high_ticket";
import type { Submission } from "@/db/schema";
import { buildSummary } from "@/server/email/summary-template";

function submission(answers: Record<string, unknown>, over: Partial<Submission> = {}): Submission {
  return {
    id: "01TEST",
    publicToken: "tok",
    leadId: "L1",
    formId: "f",
    formSlug: "generic_csc",
    formVersionId: "form_generic_csc_v1",
    formVersion: 1,
    moduleIds: [],
    moduleVersionIds: [],
    moduleVersions: [],
    entryMode: "public",
    inviteLinkId: null,
    answersJson: answers,
    displayName: "測試甲",
    email: "a@example.com",
    phoneE164: "+85290000000",
    createdAt: new Date("2026-09-07T02:00:00Z"),
    submittedAt: new Date("2026-09-07T02:00:00Z"),
    source: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    landingPage: null,
    cta: null,
    referrer: null,
    consentApplication: true,
    consentMarketing: false,
    internalStatus: "new",
    reviewOwner: null,
    duplicateOf: null,
    notionSyncStatus: "skipped",
    notionPageId: null,
    isTest: true,
    ipHash: null,
    userAgent: null,
    ...over,
  } as unknown as Submission;
}

const LONG = "機密長答內容不可外洩";

describe("email summary", () => {
  it("never includes long-answer content, in text or html", () => {
    const s = submission({
      G05: "beauty",
      G08: ["leads_sales"],
      G09: "leads_sales",
      G10: LONG,
      G11: LONG,
      G12: LONG,
      G13: LONG,
      G16: LONG,
      G17: "full_csc",
    });
    const msg = buildSummary({
      submission: s,
      formTitle: genericCscV1.title,
      questions: genericCscV1.questions,
      adminUrl: "https://example.invalid/admin/submissions/01TEST",
    });
    expect(msg.text).not.toContain(LONG);
    expect(msg.html).not.toContain(LONG);
    expect(msg.subject).not.toContain(LONG);
  });

  it("resolves G09's label through optionsFrom rather than printing the raw value", () => {
    const s = submission({ G08: ["team_delegation", "sop_experience"], G09: "team_delegation" });
    const msg = buildSummary({
      submission: s,
      formTitle: genericCscV1.title,
      questions: genericCscV1.questions,
      adminUrl: null,
    });
    expect(msg.text).toContain("招聘、培訓、留人或授權");
    expect(msg.text).not.toContain("team_delegation");
  });

  it("resolves an optionsFrom value that only the rule's append provides", () => {
    const s = submission({ G08: ["leads_sales"], G09: "other" });
    const msg = buildSummary({
      submission: s,
      formTitle: genericCscV1.title,
      questions: genericCscV1.questions,
      adminUrl: null,
    });
    expect(msg.text).toContain("其他");
  });

  it("marks TEST submissions in the subject and keeps scale answers readable", () => {
    const s = submission({ Q23: 8, Q03: "founder" }, { formSlug: "high_ticket", isTest: true });
    const msg = buildSummary({
      submission: s,
      formTitle: highTicketV1.title,
      questions: highTicketV1.questions,
      adminUrl: null,
    });
    expect(msg.subject).toMatch(/^\[TEST\] \[CSC\] 新提交｜/);
    expect(msg.text).toContain("8");
    expect(msg.text).toContain("創辦人");
  });
});
