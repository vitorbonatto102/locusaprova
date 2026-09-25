CREATE TABLE `simulations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_id` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`total_score` real NOT NULL,
	`max_score` real NOT NULL,
	`answers_json` text NOT NULL,
	`correction_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `simulations_user_created_idx` ON `simulations` (`user_id`,`created_at`);