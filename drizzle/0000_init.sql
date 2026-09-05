CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`to_json` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error_text` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `email_log_submission_idx` ON `email_log` (`submission_id`);--> statement-breakpoint
CREATE TABLE `form_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`change_note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_versions_form_version_idx` ON `form_versions` (`form_id`,`version`);--> statement-breakpoint
CREATE INDEX `form_versions_form_status_idx` ON `form_versions` (`form_id`,`status`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'enabled' NOT NULL,
	`access` text DEFAULT 'public' NOT NULL,
	`current_version_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_slug_unique` ON `forms` (`slug`);--> statement-breakpoint
CREATE TABLE `invite_links` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`form_id` text NOT NULL,
	`module_ids` text DEFAULT '[]' NOT NULL,
	`label` text NOT NULL,
	`lead_hint_name` text,
	`lead_hint_email` text,
	`prefill_json` text,
	`expires_at` integer,
	`max_uses` integer,
	`use_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_links_token_unique` ON `invite_links` (`token`);--> statement-breakpoint
CREATE INDEX `invite_links_form_status_idx` ON `invite_links` (`form_id`,`status`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`email` text,
	`phone_e164` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`is_test` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_phone_idx` ON `leads` (`phone_e164`);--> statement-breakpoint
CREATE TABLE `module_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`change_note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_versions_module_version_idx` ON `module_versions` (`module_id`,`version`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`form_slug` text DEFAULT 'high_ticket' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_version_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_slug_unique` ON `modules` (`slug`);--> statement-breakpoint
CREATE TABLE `notion_sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`status` text NOT NULL,
	`notion_page_id` text,
	`error_text` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`triggered_by` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notion_sync_log_submission_idx` ON `notion_sync_log` (`submission_id`,`attempt`);--> statement-breakpoint
CREATE INDEX `notion_sync_log_status_idx` ON `notion_sync_log` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `submission_tags` (
	`submission_id` text NOT NULL,
	`question_id` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`submission_id`, `question_id`, `value`),
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submission_tags_q_v_idx` ON `submission_tags` (`question_id`,`value`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`lead_id` text NOT NULL,
	`form_id` text NOT NULL,
	`form_slug` text NOT NULL,
	`form_version_id` text NOT NULL,
	`form_version` integer NOT NULL,
	`module_ids` text DEFAULT '[]' NOT NULL,
	`module_version_ids` text DEFAULT '[]' NOT NULL,
	`module_versions` text DEFAULT '[]' NOT NULL,
	`entry_mode` text DEFAULT 'public' NOT NULL,
	`invite_link_id` text,
	`answers_json` text NOT NULL,
	`display_name` text,
	`email` text,
	`phone_e164` text,
	`created_at` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	`source` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_term` text,
	`utm_content` text,
	`landing_page` text,
	`cta` text,
	`referrer` text,
	`consent_application` integer DEFAULT false NOT NULL,
	`consent_marketing` integer DEFAULT false NOT NULL,
	`internal_status` text DEFAULT 'new' NOT NULL,
	`review_owner` text,
	`duplicate_of` text,
	`notion_sync_status` text DEFAULT 'pending' NOT NULL,
	`notion_page_id` text,
	`is_test` integer DEFAULT false NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_version_id`) REFERENCES `form_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_public_token_unique` ON `submissions` (`public_token`);--> statement-breakpoint
CREATE INDEX `submissions_form_submitted_idx` ON `submissions` (`form_slug`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `submissions_submitted_idx` ON `submissions` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`internal_status`);--> statement-breakpoint
CREATE INDEX `submissions_owner_idx` ON `submissions` (`review_owner`);--> statement-breakpoint
CREATE INDEX `submissions_source_idx` ON `submissions` (`source`);--> statement-breakpoint
CREATE INDEX `submissions_utm_source_idx` ON `submissions` (`utm_source`);--> statement-breakpoint
CREATE INDEX `submissions_email_idx` ON `submissions` (`email`);--> statement-breakpoint
CREATE INDEX `submissions_phone_idx` ON `submissions` (`phone_e164`);--> statement-breakpoint
CREATE INDEX `submissions_lead_idx` ON `submissions` (`lead_id`);--> statement-breakpoint
CREATE INDEX `submissions_notion_idx` ON `submissions` (`notion_sync_status`);