CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `careers` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `exam_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `careers_category_idx` ON `careers` (`category_id`);--> statement-breakpoint
CREATE TABLE `exam_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_notice_knowledge` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_id` text NOT NULL,
	`exam_target_id` text NOT NULL,
	`knowledge_node_id` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`relevance` real DEFAULT 1 NOT NULL,
	`block_id` text,
	`source_page` integer,
	`source_url` text,
	FOREIGN KEY (`notice_id`) REFERENCES `exam_notices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_target_id`) REFERENCES `exam_targets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_notice_knowledge_pair_idx` ON `exam_notice_knowledge` (`exam_target_id`,`knowledge_node_id`);--> statement-breakpoint
CREATE INDEX `exam_notice_knowledge_notice_block_idx` ON `exam_notice_knowledge` (`notice_id`,`block_id`);--> statement-breakpoint
CREATE TABLE `exam_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`position_id` text NOT NULL,
	`board_id` text NOT NULL,
	`title` text NOT NULL,
	`published_at` text,
	`scoring_strategy` text NOT NULL,
	`rules_json` text DEFAULT '{}' NOT NULL,
	`source_url` text NOT NULL,
	`source_document` text NOT NULL,
	`retrieved_at` integer NOT NULL,
	`validation_status` text DEFAULT 'raw' NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_notices_position_published_idx` ON `exam_notices` (`position_id`,`published_at`);--> statement-breakpoint
CREATE TABLE `exam_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`career_id` text NOT NULL,
	`institution_id` text,
	`position_id` text,
	`notice_id` text,
	`mode` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `exam_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`career_id`) REFERENCES `careers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notice_id`) REFERENCES `exam_notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_targets_career_status_idx` ON `exam_targets` (`career_id`,`status`);--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` text PRIMARY KEY NOT NULL,
	`career_id` text NOT NULL,
	`name` text NOT NULL,
	`scope` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`career_id`) REFERENCES `careers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `institutions_career_idx` ON `institutions` (`career_id`);--> statement-breakpoint
CREATE TABLE `knowledge_mastery` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`knowledge_node_id` text NOT NULL,
	`mastery` real DEFAULT 0 NOT NULL,
	`stability_days` real DEFAULT 0.5 NOT NULL,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'unseen' NOT NULL,
	`next_review_at` integer NOT NULL,
	`last_reviewed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_mastery_user_node_idx` ON `knowledge_mastery` (`user_id`,`knowledge_node_id`);--> statement-breakpoint
CREATE INDEX `knowledge_mastery_user_due_idx` ON `knowledge_mastery` (`user_id`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `knowledge_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`node_type` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`validation_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `knowledge_nodes_parent_type_idx` ON `knowledge_nodes` (`parent_id`,`node_type`);--> statement-breakpoint
CREATE INDEX `knowledge_nodes_slug_idx` ON `knowledge_nodes` (`slug`);--> statement-breakpoint
CREATE TABLE `knowledge_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`knowledge_node_id` text NOT NULL,
	`question_id` text,
	`reason` text NOT NULL,
	`scheduled_for` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `knowledge_reviews_user_due_idx` ON `knowledge_reviews` (`user_id`,`completed_at`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `learning_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`question_id` text NOT NULL,
	`knowledge_node_id` text NOT NULL,
	`category` text NOT NULL,
	`suggested_category` text NOT NULL,
	`confidence` integer NOT NULL,
	`suspected_misconception` text,
	`next_review_at` integer NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attempt_id`) REFERENCES `objective_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_errors_user_due_idx` ON `learning_errors` (`user_id`,`resolved_at`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `objective_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_target_id` text NOT NULL,
	`question_id` text NOT NULL,
	`session_type` text NOT NULL,
	`answer_json` text NOT NULL,
	`is_correct` integer NOT NULL,
	`raw_score` real NOT NULL,
	`confidence` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`error_category` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_target_id`) REFERENCES `exam_targets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `objective_attempts_user_target_created_idx` ON `objective_attempts` (`user_id`,`exam_target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `objective_attempts_user_question_idx` ON `objective_attempts` (`user_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `objective_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_target_id` text NOT NULL,
	`session_type` text NOT NULL,
	`question_ids_json` text NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_target_id`) REFERENCES `exam_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `objective_sessions_user_target_status_idx` ON `objective_sessions` (`user_id`,`exam_target_id`,`session_type`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `positions_institution_idx` ON `positions` (`institution_id`);--> statement-breakpoint
CREATE TABLE `question_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`statement` text NOT NULL,
	`question_type` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`correct_answer_json` text NOT NULL,
	`explanation` text NOT NULL,
	`decision_point` text,
	`misconception` text,
	`board_id` text,
	`institution_id` text,
	`position_id` text,
	`exam_notice_id` text,
	`difficulty` integer DEFAULT 1 NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`is_official` integer DEFAULT false NOT NULL,
	`author` text,
	`reviewer` text,
	`legal_review_status` text DEFAULT 'not_applicable' NOT NULL,
	`legal_version` text,
	`validation_status` text DEFAULT 'raw' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_notice_id`) REFERENCES `exam_notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `question_bank_type_validation_idx` ON `question_bank` (`question_type`,`validation_status`);--> statement-breakpoint
CREATE TABLE `question_knowledge_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`knowledge_node_id` text NOT NULL,
	`relation` text DEFAULT 'primary' NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_knowledge_nodes_pair_idx` ON `question_knowledge_nodes` (`question_id`,`knowledge_node_id`);--> statement-breakpoint
CREATE INDEX `question_knowledge_nodes_node_idx` ON `question_knowledge_nodes` (`knowledge_node_id`);--> statement-breakpoint
CREATE TABLE `user_exam_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_target_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'interested' NOT NULL,
	`experience_level` text DEFAULT 'starting' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_target_id`) REFERENCES `exam_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_exam_targets_pair_idx` ON `user_exam_targets` (`user_id`,`exam_target_id`);--> statement-breakpoint
CREATE INDEX `user_exam_targets_primary_idx` ON `user_exam_targets` (`user_id`,`is_primary`,`status`);