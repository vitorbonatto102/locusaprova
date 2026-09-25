CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"exercise_id" text NOT NULL,
	"thesis_id" text,
	"kind" text NOT NULL,
	"answer" text NOT NULL,
	"score" double precision NOT NULL,
	"max_score" double precision NOT NULL,
	"confidence" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"feedback_json" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"profile_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "careers" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"exercise_id" text NOT NULL,
	"thesis_id" text,
	"category" text NOT NULL,
	"confidence" integer NOT NULL,
	"excerpt" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_notice_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"notice_id" text NOT NULL,
	"exam_target_id" text NOT NULL,
	"knowledge_node_id" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"relevance" double precision DEFAULT 1 NOT NULL,
	"block_id" text,
	"source_page" integer,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "exam_notices" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"position_id" text NOT NULL,
	"board_id" text NOT NULL,
	"title" text NOT NULL,
	"published_at" text,
	"scoring_strategy" text NOT NULL,
	"rules_json" text DEFAULT '{}' NOT NULL,
	"source_url" text NOT NULL,
	"source_document" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"validation_status" text DEFAULT 'raw' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"career_id" text NOT NULL,
	"institution_id" text,
	"position_id" text,
	"notice_id" text,
	"mode" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_family_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"specialization_id" text,
	"label" text NOT NULL,
	"content_status" text DEFAULT 'planned' NOT NULL,
	"simulation_mode" text NOT NULL,
	"capabilities_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"label" text NOT NULL,
	"exam_date" text,
	"duration_minutes" integer NOT NULL,
	"format" text NOT NULL,
	"structure_json" text NOT NULL,
	"source_url" text,
	"validation_status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"career_id" text NOT NULL,
	"name" text NOT NULL,
	"scope" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_mastery" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_node_id" text NOT NULL,
	"mastery" double precision DEFAULT 0 NOT NULL,
	"stability_days" double precision DEFAULT 0.5 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'unseen' NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"node_type" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"source_json" text DEFAULT '{}' NOT NULL,
	"validation_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_node_id" text NOT NULL,
	"question_id" text,
	"reason" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_errors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"question_id" text NOT NULL,
	"knowledge_node_id" text NOT NULL,
	"category" text NOT NULL,
	"suggested_category" text NOT NULL,
	"confidence" integer NOT NULL,
	"suspected_misconception" text,
	"next_review_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_items" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"subject_id" text,
	"topic_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content_json" text NOT NULL,
	"source_json" text DEFAULT '{}' NOT NULL,
	"validation_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"skill_id" text NOT NULL,
	"mastery" double precision DEFAULT 0 NOT NULL,
	"stability_days" double precision DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'learning' NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objective_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exam_target_id" text NOT NULL,
	"question_id" text NOT NULL,
	"session_type" text NOT NULL,
	"answer_json" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"raw_score" double precision NOT NULL,
	"confidence" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"error_category" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objective_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exam_target_id" text NOT NULL,
	"session_type" text NOT NULL,
	"question_ids_json" text NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank" (
	"id" text PRIMARY KEY NOT NULL,
	"statement" text NOT NULL,
	"question_type" text NOT NULL,
	"options_json" text DEFAULT '[]' NOT NULL,
	"correct_answer_json" text NOT NULL,
	"explanation" text NOT NULL,
	"decision_point" text,
	"misconception" text,
	"board_id" text,
	"institution_id" text,
	"position_id" text,
	"exam_notice_id" text,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"source_json" text DEFAULT '{}' NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"author" text,
	"reviewer" text,
	"legal_review_status" text DEFAULT 'not_applicable' NOT NULL,
	"legal_version" text,
	"validation_status" text DEFAULT 'raw' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_knowledge_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"knowledge_node_id" text NOT NULL,
	"relation" text DEFAULT 'primary' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"learning_item_id" text,
	"subject_id" text,
	"topic_id" text,
	"format" text NOT NULL,
	"stem" text NOT NULL,
	"options_json" text DEFAULT '[]' NOT NULL,
	"answer_json" text NOT NULL,
	"explanation" text,
	"source_json" text DEFAULT '{}' NOT NULL,
	"validation_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text NOT NULL,
	"learning_item_id" text,
	"skill_id" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"outcome_json" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"exam_id" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"total_score" double precision NOT NULL,
	"max_score" double precision NOT NULL,
	"answers_json" text NOT NULL,
	"correction_json" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"metadata_json" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text NOT NULL,
	"exam_date" text,
	"daily_minutes" integer NOT NULL,
	"self_reported_difficulty_json" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"mode" text NOT NULL,
	"minutes" integer NOT NULL,
	"items_completed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"weight" double precision DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"parent_topic_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"plan_date" text NOT NULL,
	"requested_minutes" integer NOT NULL,
	"activity_ids_json" text NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"draft_answer" text DEFAULT '' NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"phase" text DEFAULT 'answering' NOT NULL,
	"feedback_json" text,
	"activity_states_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_exam_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exam_target_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"experience_level" text DEFAULT 'starting' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"goal_date" text,
	"weekly_minutes" integer DEFAULT 150 NOT NULL,
	"daily_minutes" integer DEFAULT 30 NOT NULL,
	"active_track_id" text DEFAULT 'oab-second-phase-penal' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "careers" ADD CONSTRAINT "careers_category_id_exam_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exam_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_log" ADD CONSTRAINT "error_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notice_knowledge" ADD CONSTRAINT "exam_notice_knowledge_notice_id_exam_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."exam_notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notice_knowledge" ADD CONSTRAINT "exam_notice_knowledge_exam_target_id_exam_targets_id_fk" FOREIGN KEY ("exam_target_id") REFERENCES "public"."exam_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notice_knowledge" ADD CONSTRAINT "exam_notice_knowledge_knowledge_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("knowledge_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notices" ADD CONSTRAINT "exam_notices_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notices" ADD CONSTRAINT "exam_notices_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notices" ADD CONSTRAINT "exam_notices_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_category_id_exam_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exam_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_notice_id_exam_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."exam_notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_mastery" ADD CONSTRAINT "knowledge_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_mastery" ADD CONSTRAINT "knowledge_mastery_knowledge_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("knowledge_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_knowledge_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("knowledge_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_errors" ADD CONSTRAINT "learning_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_errors" ADD CONSTRAINT "learning_errors_attempt_id_objective_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."objective_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_errors" ADD CONSTRAINT "learning_errors_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_errors" ADD CONSTRAINT "learning_errors_knowledge_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("knowledge_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_exam_target_id_exam_targets_id_fk" FOREIGN KEY ("exam_target_id") REFERENCES "public"."exam_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_sessions" ADD CONSTRAINT "objective_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_sessions" ADD CONSTRAINT "objective_sessions_exam_target_id_exam_targets_id_fk" FOREIGN KEY ("exam_target_id") REFERENCES "public"."exam_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_exam_notice_id_exam_notices_id_fk" FOREIGN KEY ("exam_notice_id") REFERENCES "public"."exam_notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_knowledge_nodes" ADD CONSTRAINT "question_knowledge_nodes_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_knowledge_nodes" ADD CONSTRAINT "question_knowledge_nodes_knowledge_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("knowledge_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_learning_item_id_learning_items_id_fk" FOREIGN KEY ("learning_item_id") REFERENCES "public"."learning_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_learning_item_id_learning_items_id_fk" FOREIGN KEY ("learning_item_id") REFERENCES "public"."learning_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_goals" ADD CONSTRAINT "study_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_skills" ADD CONSTRAINT "topic_skills_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_skills" ADD CONSTRAINT "topic_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_exam_targets" ADD CONSTRAINT "user_exam_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_exam_targets" ADD CONSTRAINT "user_exam_targets_exam_target_id_exam_targets_id_fk" FOREIGN KEY ("exam_target_id") REFERENCES "public"."exam_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_user_track_created_idx" ON "attempts" USING btree ("user_id","track_id","created_at");--> statement-breakpoint
CREATE INDEX "careers_category_idx" ON "careers" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "error_log_track_due_idx" ON "error_log" USING btree ("user_id","track_id","resolved","next_review_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_notice_knowledge_pair_idx" ON "exam_notice_knowledge" USING btree ("exam_target_id","knowledge_node_id");--> statement-breakpoint
CREATE INDEX "exam_notice_knowledge_notice_block_idx" ON "exam_notice_knowledge" USING btree ("notice_id","block_id");--> statement-breakpoint
CREATE INDEX "exam_notices_position_published_idx" ON "exam_notices" USING btree ("position_id","published_at");--> statement-breakpoint
CREATE INDEX "exam_targets_career_status_idx" ON "exam_targets" USING btree ("career_id","status");--> statement-breakpoint
CREATE INDEX "exam_tracks_family_stage_idx" ON "exam_tracks" USING btree ("exam_family_id","stage_id");--> statement-breakpoint
CREATE INDEX "exams_track_date_idx" ON "exams" USING btree ("track_id","exam_date");--> statement-breakpoint
CREATE INDEX "institutions_career_idx" ON "institutions" USING btree ("career_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_mastery_user_node_idx" ON "knowledge_mastery" USING btree ("user_id","knowledge_node_id");--> statement-breakpoint
CREATE INDEX "knowledge_mastery_user_due_idx" ON "knowledge_mastery" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_parent_type_idx" ON "knowledge_nodes" USING btree ("parent_id","node_type");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_slug_idx" ON "knowledge_nodes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "knowledge_reviews_user_due_idx" ON "knowledge_reviews" USING btree ("user_id","completed_at","scheduled_for");--> statement-breakpoint
CREATE INDEX "learning_errors_user_due_idx" ON "learning_errors" USING btree ("user_id","resolved_at","next_review_at");--> statement-breakpoint
CREATE INDEX "learning_items_track_topic_idx" ON "learning_items" USING btree ("track_id","topic_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_user_track_skill_idx" ON "mastery" USING btree ("user_id","track_id","skill_id");--> statement-breakpoint
CREATE INDEX "objective_attempts_user_target_created_idx" ON "objective_attempts" USING btree ("user_id","exam_target_id","created_at");--> statement-breakpoint
CREATE INDEX "objective_attempts_user_question_idx" ON "objective_attempts" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "objective_sessions_user_target_status_idx" ON "objective_sessions" USING btree ("user_id","exam_target_id","session_type","status","updated_at");--> statement-breakpoint
CREATE INDEX "positions_institution_idx" ON "positions" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "question_bank_type_validation_idx" ON "question_bank" USING btree ("question_type","validation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "question_knowledge_nodes_pair_idx" ON "question_knowledge_nodes" USING btree ("question_id","knowledge_node_id");--> statement-breakpoint
CREATE INDEX "question_knowledge_nodes_node_idx" ON "question_knowledge_nodes" USING btree ("knowledge_node_id");--> statement-breakpoint
CREATE INDEX "questions_track_topic_format_idx" ON "questions" USING btree ("track_id","topic_id","format");--> statement-breakpoint
CREATE INDEX "reviews_user_track_due_idx" ON "reviews" USING btree ("user_id","track_id","completed_at","scheduled_for");--> statement-breakpoint
CREATE INDEX "simulations_user_track_created_idx" ON "simulations" USING btree ("user_id","track_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_code_idx" ON "skills" USING btree ("code");--> statement-breakpoint
CREATE INDEX "study_goals_user_status_idx" ON "study_goals" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_track_slug_idx" ON "subjects" USING btree ("track_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_skills_pair_idx" ON "topic_skills" USING btree ("topic_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_subject_slug_idx" ON "topics" USING btree ("subject_id","slug");--> statement-breakpoint
CREATE INDEX "training_sessions_user_track_status_updated_idx" ON "training_sessions" USING btree ("user_id","track_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_exam_targets_pair_idx" ON "user_exam_targets" USING btree ("user_id","exam_target_id");--> statement-breakpoint
CREATE INDEX "user_exam_targets_primary_idx" ON "user_exam_targets" USING btree ("user_id","is_primary","status");