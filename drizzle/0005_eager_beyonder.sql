CREATE TABLE `exam_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_family_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`specialization_id` text,
	`label` text NOT NULL,
	`content_status` text DEFAULT 'planned' NOT NULL,
	`simulation_mode` text NOT NULL,
	`capabilities_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exam_tracks_family_stage_idx` ON `exam_tracks` (`exam_family_id`,`stage_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`label` text NOT NULL,
	`exam_date` text,
	`duration_minutes` integer NOT NULL,
	`format` text NOT NULL,
	`structure_json` text NOT NULL,
	`source_url` text,
	`validation_status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exams_track_date_idx` ON `exams` (`track_id`,`exam_date`);--> statement-breakpoint
CREATE TABLE `learning_items` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`subject_id` text,
	`topic_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`validation_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_items_track_topic_idx` ON `learning_items` (`track_id`,`topic_id`,`kind`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`learning_item_id` text,
	`subject_id` text,
	`topic_id` text,
	`format` text NOT NULL,
	`stem` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`answer_json` text NOT NULL,
	`explanation` text,
	`source_json` text DEFAULT '{}' NOT NULL,
	`validation_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`learning_item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_track_topic_format_idx` ON `questions` (`track_id`,`topic_id`,`format`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`learning_item_id` text,
	`skill_id` text,
	`scheduled_for` integer NOT NULL,
	`completed_at` integer,
	`outcome_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learning_item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reviews_user_track_due_idx` ON `reviews` (`user_id`,`track_id`,`completed_at`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`metadata_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_code_idx` ON `skills` (`code`);--> statement-breakpoint
CREATE TABLE `study_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`exam_date` text,
	`daily_minutes` integer NOT NULL,
	`self_reported_difficulty_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `study_goals_user_status_idx` ON `study_goals` (`user_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_track_slug_idx` ON `subjects` (`track_id`,`slug`);--> statement-breakpoint
CREATE TABLE `topic_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topic_skills_pair_idx` ON `topic_skills` (`topic_id`,`skill_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`parent_topic_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_subject_slug_idx` ON `topics` (`subject_id`,`slug`);--> statement-breakpoint
ALTER TABLE `users` ADD `daily_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `onboarding_completed_at` integer;