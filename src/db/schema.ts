import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { FormDefinition, ModuleDefinition, Answers } from "@/engine/types";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

export const forms = sqliteTable("forms", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status", { enum: ["enabled", "disabled"] }).notNull().default("enabled"),
  access: text("access", { enum: ["public", "invite_only"] }).notNull().default("public"),
  currentVersionId: text("current_version_id"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const formVersions = sqliteTable(
  "form_versions",
  {
    id: text("id").primaryKey(),
    formId: text("form_id").notNull().references(() => forms.id),
    version: integer("version").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    definitionJson: text("definition_json", { mode: "json" }).$type<FormDefinition>().notNull(),
    changeNote: text("change_note"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").notNull(),
    publishedAt: ts("published_at"),
  },
  (t) => [uniqueIndex("form_versions_form_version_idx").on(t.formId, t.version), index("form_versions_form_status_idx").on(t.formId, t.status)],
);

export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  formSlug: text("form_slug").notNull().default("high_ticket"),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  currentVersionId: text("current_version_id"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const moduleVersions = sqliteTable(
  "module_versions",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id").notNull().references(() => modules.id),
    version: integer("version").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    definitionJson: text("definition_json", { mode: "json" }).$type<ModuleDefinition>().notNull(),
    changeNote: text("change_note"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").notNull(),
    publishedAt: ts("published_at"),
  },
  (t) => [uniqueIndex("module_versions_module_version_idx").on(t.moduleId, t.version)],
);

export const inviteLinks = sqliteTable(
  "invite_links",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    formId: text("form_id").notNull().references(() => forms.id),
    moduleIds: text("module_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    label: text("label").notNull(),
    leadHintName: text("lead_hint_name"),
    leadHintEmail: text("lead_hint_email"),
    prefillJson: text("prefill_json", { mode: "json" }).$type<Record<string, string>>(),
    expiresAt: ts("expires_at"),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("invite_links_form_status_idx").on(t.formId, t.status)],
);

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name"),
    email: text("email"),
    phoneE164: text("phone_e164"),
    firstSeenAt: ts("first_seen_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull(),
    isTest: bool("is_test").notNull().default(false),
  },
  (t) => [index("leads_email_idx").on(t.email), index("leads_phone_idx").on(t.phoneE164)],
);

export const INTERNAL_STATUSES = ["new", "reviewing", "contacted", "qualified", "closed", "spam"] as const;
export type InternalStatus = (typeof INTERNAL_STATUSES)[number];
export const NOTION_STATUSES = ["pending", "synced", "failed", "skipped"] as const;
export type NotionStatus = (typeof NOTION_STATUSES)[number];

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    publicToken: text("public_token").notNull().unique(),
    leadId: text("lead_id").notNull().references(() => leads.id),
    formId: text("form_id").notNull().references(() => forms.id),
    formSlug: text("form_slug").notNull(),
    formVersionId: text("form_version_id").notNull().references(() => formVersions.id),
    formVersion: integer("form_version").notNull(),
    moduleIds: text("module_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    moduleVersionIds: text("module_version_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    moduleVersions: text("module_versions", { mode: "json" }).$type<Array<{ moduleId: string; slug: string; version: number }>>().notNull().default([]),
    entryMode: text("entry_mode", { enum: ["public", "invite"] }).notNull().default("public"),
    inviteLinkId: text("invite_link_id"),
    answersJson: text("answers_json", { mode: "json" }).$type<Answers>().notNull(),
    displayName: text("display_name"),
    email: text("email"),
    phoneE164: text("phone_e164"),
    createdAt: ts("created_at").notNull(),
    submittedAt: ts("submitted_at").notNull(),
    source: text("source"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    landingPage: text("landing_page"),
    cta: text("cta"),
    referrer: text("referrer"),
    consentApplication: bool("consent_application").notNull().default(false),
    consentMarketing: bool("consent_marketing").notNull().default(false),
    internalStatus: text("internal_status", { enum: INTERNAL_STATUSES }).notNull().default("new"),
    reviewOwner: text("review_owner"),
    duplicateOf: text("duplicate_of"),
    notionSyncStatus: text("notion_sync_status", { enum: NOTION_STATUSES }).notNull().default("pending"),
    notionPageId: text("notion_page_id"),
    isTest: bool("is_test").notNull().default(false),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("submissions_form_submitted_idx").on(t.formSlug, t.submittedAt),
    index("submissions_submitted_idx").on(t.submittedAt),
    index("submissions_status_idx").on(t.internalStatus),
    index("submissions_owner_idx").on(t.reviewOwner),
    index("submissions_source_idx").on(t.source),
    index("submissions_utm_source_idx").on(t.utmSource),
    index("submissions_email_idx").on(t.email),
    index("submissions_phone_idx").on(t.phoneE164),
    index("submissions_lead_idx").on(t.leadId),
    index("submissions_notion_idx").on(t.notionSyncStatus),
  ],
);

export const submissionTags = sqliteTable(
  "submission_tags",
  {
    submissionId: text("submission_id").notNull().references(() => submissions.id),
    questionId: text("question_id").notNull(),
    value: text("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.questionId, t.value] }), index("submission_tags_q_v_idx").on(t.questionId, t.value)],
);

export const notionSyncLog = sqliteTable(
  "notion_sync_log",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id").notNull().references(() => submissions.id),
    attempt: integer("attempt").notNull(),
    status: text("status", { enum: ["pending", "success", "failed", "skipped"] }).notNull(),
    notionPageId: text("notion_page_id"),
    errorText: text("error_text"),
    startedAt: ts("started_at").notNull(),
    finishedAt: ts("finished_at"),
    triggeredBy: text("triggered_by").notNull(),
  },
  (t) => [index("notion_sync_log_submission_idx").on(t.submissionId, t.attempt), index("notion_sync_log_status_idx").on(t.status)],
);

export const emailLog = sqliteTable(
  "email_log",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id").notNull().references(() => submissions.id),
    toJson: text("to_json", { mode: "json" }).$type<string[]>().notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
    providerId: text("provider_id"),
    errorText: text("error_text"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("email_log_submission_idx").on(t.submissionId)],
);

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["owner", "admin"] }).notNull().default("admin"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: ts("locked_until"),
  createdAt: ts("created_at").notNull(),
  lastLoginAt: ts("last_login_at"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => adminUsers.id),
    createdAt: ts("created_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: ts("updated_at").notNull(),
  updatedBy: text("updated_by"),
});

export type Form = typeof forms.$inferSelect;
export type FormVersion = typeof formVersions.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type ModuleVersion = typeof moduleVersions.$inferSelect;
export type InviteLink = typeof inviteLinks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
