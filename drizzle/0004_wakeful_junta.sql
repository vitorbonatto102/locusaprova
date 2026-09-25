DROP INDEX `attempts_user_created_idx`;--> statement-breakpoint
ALTER TABLE `attempts` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
CREATE INDEX `attempts_user_track_created_idx` ON `attempts` (`user_id`,`track_id`,`created_at`);--> statement-breakpoint
DROP INDEX `error_log_due_idx`;--> statement-breakpoint
ALTER TABLE `error_log` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
CREATE INDEX `error_log_track_due_idx` ON `error_log` (`user_id`,`track_id`,`resolved`,`next_review_at`);--> statement-breakpoint
DROP INDEX `mastery_user_skill_idx`;--> statement-breakpoint
ALTER TABLE `mastery` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `mastery_user_track_skill_idx` ON `mastery` (`user_id`,`track_id`,`skill_id`);--> statement-breakpoint
DROP INDEX `simulations_user_created_idx`;--> statement-breakpoint
ALTER TABLE `simulations` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
CREATE INDEX `simulations_user_track_created_idx` ON `simulations` (`user_id`,`track_id`,`created_at`);--> statement-breakpoint
DROP INDEX `training_sessions_user_status_updated_idx`;--> statement-breakpoint
ALTER TABLE `training_sessions` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
CREATE INDEX `training_sessions_user_track_status_updated_idx` ON `training_sessions` (`user_id`,`track_id`,`status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active_track_id` text DEFAULT 'oab-second-phase-penal' NOT NULL;