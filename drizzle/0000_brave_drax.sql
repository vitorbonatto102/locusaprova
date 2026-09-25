CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`thesis_id` text,
	`kind` text NOT NULL,
	`answer` text NOT NULL,
	`score` real NOT NULL,
	`max_score` real NOT NULL,
	`confidence` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`feedback_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_user_created_idx` ON `attempts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `error_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`thesis_id` text,
	`category` text NOT NULL,
	`confidence` integer NOT NULL,
	`excerpt` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`next_review_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `error_log_due_idx` ON `error_log` (`user_id`,`resolved`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `mastery` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`mastery` real DEFAULT 0 NOT NULL,
	`stability_days` real DEFAULT 1 NOT NULL,
	`state` text DEFAULT 'learning' NOT NULL,
	`next_review_at` integer NOT NULL,
	`last_reviewed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mastery_user_skill_idx` ON `mastery` (`user_id`,`skill_id`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`minutes` integer NOT NULL,
	`items_completed` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal_date` text,
	`weekly_minutes` integer DEFAULT 150 NOT NULL,
	`created_at` integer NOT NULL
);
