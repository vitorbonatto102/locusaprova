CREATE TABLE `training_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_date` text NOT NULL,
	`requested_minutes` integer NOT NULL,
	`activity_ids_json` text NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`draft_answer` text DEFAULT '' NOT NULL,
	`confidence` integer DEFAULT 3 NOT NULL,
	`phase` text DEFAULT 'answering' NOT NULL,
	`feedback_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_sessions_user_status_updated_idx` ON `training_sessions` (`user_id`,`status`,`updated_at`);