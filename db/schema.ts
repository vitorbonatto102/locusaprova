import { boolean, doublePrecision, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goalDate: text("goal_date"),
  weeklyMinutes: integer("weekly_minutes").notNull().default(150),
  dailyMinutes: integer("daily_minutes").notNull().default(30),
  activeTrackId: text("active_track_id").notNull().default("oab-second-phase-penal"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const examTracks = pgTable("exam_tracks", {
  id: text("id").primaryKey(),
  examFamilyId: text("exam_family_id").notNull(),
  stageId: text("stage_id").notNull(),
  specializationId: text("specialization_id"),
  label: text("label").notNull(),
  contentStatus: text("content_status").notNull().default("planned"),
  simulationMode: text("simulation_mode").notNull(),
  capabilitiesJson: text("capabilities_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("exam_tracks_family_stage_idx").on(table.examFamilyId, table.stageId)]);

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("draft"),
  metadataJson: text("metadata_json").notNull().default("{}"),
}, (table) => [uniqueIndex("subjects_track_slug_idx").on(table.trackId, table.slug)]);

export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  parentTopicId: text("parent_topic_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("draft"),
  metadataJson: text("metadata_json").notNull().default("{}"),
}, (table) => [uniqueIndex("topics_subject_slug_idx").on(table.subjectId, table.slug)]);

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  description: text("description"),
  metadataJson: text("metadata_json").notNull().default("{}"),
}, (table) => [uniqueIndex("skills_code_idx").on(table.code)]);

export const topicSkills = pgTable("topic_skills", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().references(() => topics.id),
  skillId: text("skill_id").notNull().references(() => skills.id),
  weight: doublePrecision("weight").notNull().default(1),
}, (table) => [uniqueIndex("topic_skills_pair_idx").on(table.topicId, table.skillId)]);

export const learningItems = pgTable("learning_items", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  subjectId: text("subject_id").references(() => subjects.id),
  topicId: text("topic_id").references(() => topics.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  sourceJson: text("source_json").notNull().default("{}"),
  validationStatus: text("validation_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("learning_items_track_topic_idx").on(table.trackId, table.topicId, table.kind)]);

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  learningItemId: text("learning_item_id").references(() => learningItems.id),
  subjectId: text("subject_id").references(() => subjects.id),
  topicId: text("topic_id").references(() => topics.id),
  format: text("format").notNull(),
  stem: text("stem").notNull(),
  optionsJson: text("options_json").notNull().default("[]"),
  answerJson: text("answer_json").notNull(),
  explanation: text("explanation"),
  sourceJson: text("source_json").notNull().default("{}"),
  validationStatus: text("validation_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("questions_track_topic_format_idx").on(table.trackId, table.topicId, table.format)]);

export const exams = pgTable("exams", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  label: text("label").notNull(),
  examDate: text("exam_date"),
  durationMinutes: integer("duration_minutes").notNull(),
  format: text("format").notNull(),
  structureJson: text("structure_json").notNull(),
  sourceUrl: text("source_url"),
  validationStatus: text("validation_status").notNull().default("draft"),
}, (table) => [index("exams_track_date_idx").on(table.trackId, table.examDate)]);

export const studyGoals = pgTable("study_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull(),
  examDate: text("exam_date"),
  dailyMinutes: integer("daily_minutes").notNull(),
  selfReportedDifficultyJson: text("self_reported_difficulty_json").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("study_goals_user_status_idx").on(table.userId, table.status, table.updatedAt)]);

export const attempts = pgTable("attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  exerciseId: text("exercise_id").notNull(),
  thesisId: text("thesis_id"),
  kind: text("kind").notNull(),
  answer: text("answer").notNull(),
  score: doublePrecision("score").notNull(),
  maxScore: doublePrecision("max_score").notNull(),
  confidence: integer("confidence").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  feedbackJson: text("feedback_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("attempts_user_track_created_idx").on(table.userId, table.trackId, table.createdAt)]);

export const mastery = pgTable("mastery", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  skillId: text("skill_id").notNull(),
  mastery: doublePrecision("mastery").notNull().default(0),
  stabilityDays: doublePrecision("stability_days").notNull().default(1),
  state: text("state").notNull().default("learning"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("mastery_user_track_skill_idx").on(table.userId, table.trackId, table.skillId)]);

export const errorLog = pgTable("error_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  exerciseId: text("exercise_id").notNull(),
  thesisId: text("thesis_id"),
  category: text("category").notNull(),
  confidence: integer("confidence").notNull(),
  excerpt: text("excerpt").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("error_log_track_due_idx").on(table.userId, table.trackId, table.resolved, table.nextReviewAt)]);

export const studySessions = pgTable("study_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  mode: text("mode").notNull(),
  minutes: integer("minutes").notNull(),
  itemsCompleted: integer("items_completed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const trainingSessions = pgTable("training_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  planDate: text("plan_date").notNull(),
  requestedMinutes: integer("requested_minutes").notNull(),
  activityIdsJson: text("activity_ids_json").notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  draftAnswer: text("draft_answer").notNull().default(""),
  confidence: integer("confidence").notNull().default(3),
  phase: text("phase").notNull().default("answering"),
  feedbackJson: text("feedback_json"),
  activityStatesJson: text("activity_states_json").notNull().default("{}"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("training_sessions_user_track_status_updated_idx").on(table.userId, table.trackId, table.status, table.updatedAt),
]);

export const simulations = pgTable("simulations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull().default("oab-second-phase-penal"),
  examId: text("exam_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  totalScore: doublePrecision("total_score").notNull(),
  maxScore: doublePrecision("max_score").notNull(),
  answersJson: text("answers_json").notNull(),
  correctionJson: text("correction_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("simulations_user_track_created_idx").on(table.userId, table.trackId, table.createdAt)]);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  trackId: text("track_id").notNull(),
  learningItemId: text("learning_item_id").references(() => learningItems.id),
  skillId: text("skill_id"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  outcomeJson: text("outcome_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("reviews_user_track_due_idx").on(table.userId, table.trackId, table.completedAt, table.scheduledFor)]);

// Generic exam configuration. Knowledge is independent from the exam that selected it.
export const examCategories = pgTable("exam_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const careers = pgTable("careers", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => examCategories.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("careers_category_idx").on(table.categoryId)]);

export const institutions = pgTable("institutions", {
  id: text("id").primaryKey(),
  careerId: text("career_id").notNull().references(() => careers.id),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("institutions_career_idx").on(table.careerId)]);

export const positions = pgTable("positions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("positions_institution_idx").on(table.institutionId)]);

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  profileJson: text("profile_json").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const examNotices = pgTable("exam_notices", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  positionId: text("position_id").notNull().references(() => positions.id),
  boardId: text("board_id").notNull().references(() => boards.id),
  title: text("title").notNull(),
  publishedAt: text("published_at"),
  scoringStrategy: text("scoring_strategy").notNull(),
  rulesJson: text("rules_json").notNull().default("{}"),
  sourceUrl: text("source_url").notNull(),
  sourceDocument: text("source_document").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
  validationStatus: text("validation_status").notNull().default("raw"),
}, (table) => [index("exam_notices_position_published_idx").on(table.positionId, table.publishedAt)]);

export const examTargets = pgTable("exam_targets", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => examCategories.id),
  careerId: text("career_id").notNull().references(() => careers.id),
  institutionId: text("institution_id").references(() => institutions.id),
  positionId: text("position_id").references(() => positions.id),
  noticeId: text("notice_id").references(() => examNotices.id),
  mode: text("mode").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("exam_targets_career_status_idx").on(table.careerId, table.status)]);

export const userExamTargets = pgTable("user_exam_targets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  examTargetId: text("exam_target_id").notNull().references(() => examTargets.id),
  isPrimary: boolean("is_primary").notNull().default(false),
  status: text("status").notNull().default("interested"),
  experienceLevel: text("experience_level").notNull().default("starting"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("user_exam_targets_pair_idx").on(table.userId, table.examTargetId),
  index("user_exam_targets_primary_idx").on(table.userId, table.isPrimary, table.status),
]);

export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  nodeType: text("node_type").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  sourceJson: text("source_json").notNull().default("{}"),
  validationStatus: text("validation_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("knowledge_nodes_parent_type_idx").on(table.parentId, table.nodeType),
  index("knowledge_nodes_slug_idx").on(table.slug),
]);

export const examNoticeKnowledge = pgTable("exam_notice_knowledge", {
  id: text("id").primaryKey(),
  noticeId: text("notice_id").notNull().references(() => examNotices.id),
  examTargetId: text("exam_target_id").notNull().references(() => examTargets.id),
  knowledgeNodeId: text("knowledge_node_id").notNull().references(() => knowledgeNodes.id),
  isRequired: boolean("is_required").notNull().default(true),
  relevance: doublePrecision("relevance").notNull().default(1),
  blockId: text("block_id"),
  sourcePage: integer("source_page"),
  sourceUrl: text("source_url"),
}, (table) => [
  uniqueIndex("exam_notice_knowledge_pair_idx").on(table.examTargetId, table.knowledgeNodeId),
  index("exam_notice_knowledge_notice_block_idx").on(table.noticeId, table.blockId),
]);

export const questionBank = pgTable("question_bank", {
  id: text("id").primaryKey(),
  statement: text("statement").notNull(),
  questionType: text("question_type").notNull(),
  optionsJson: text("options_json").notNull().default("[]"),
  correctAnswerJson: text("correct_answer_json").notNull(),
  explanation: text("explanation").notNull(),
  decisionPoint: text("decision_point"),
  misconception: text("misconception"),
  boardId: text("board_id").references(() => boards.id),
  institutionId: text("institution_id").references(() => institutions.id),
  positionId: text("position_id").references(() => positions.id),
  examNoticeId: text("exam_notice_id").references(() => examNotices.id),
  difficulty: integer("difficulty").notNull().default(1),
  sourceJson: text("source_json").notNull().default("{}"),
  isOfficial: boolean("is_official").notNull().default(false),
  author: text("author"),
  reviewer: text("reviewer"),
  legalReviewStatus: text("legal_review_status").notNull().default("not_applicable"),
  legalVersion: text("legal_version"),
  validationStatus: text("validation_status").notNull().default("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("question_bank_type_validation_idx").on(table.questionType, table.validationStatus)]);

export const questionKnowledgeNodes = pgTable("question_knowledge_nodes", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questionBank.id),
  knowledgeNodeId: text("knowledge_node_id").notNull().references(() => knowledgeNodes.id),
  relation: text("relation").notNull().default("primary"),
}, (table) => [
  uniqueIndex("question_knowledge_nodes_pair_idx").on(table.questionId, table.knowledgeNodeId),
  index("question_knowledge_nodes_node_idx").on(table.knowledgeNodeId),
]);

export const knowledgeMastery = pgTable("knowledge_mastery", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  knowledgeNodeId: text("knowledge_node_id").notNull().references(() => knowledgeNodes.id),
  mastery: doublePrecision("mastery").notNull().default(0),
  stabilityDays: doublePrecision("stability_days").notNull().default(0.5),
  evidenceCount: integer("evidence_count").notNull().default(0),
  state: text("state").notNull().default("unseen"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("knowledge_mastery_user_node_idx").on(table.userId, table.knowledgeNodeId),
  index("knowledge_mastery_user_due_idx").on(table.userId, table.nextReviewAt),
]);

export const objectiveAttempts = pgTable("objective_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  examTargetId: text("exam_target_id").notNull().references(() => examTargets.id),
  questionId: text("question_id").notNull().references(() => questionBank.id),
  sessionType: text("session_type").notNull(),
  answerJson: text("answer_json").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  rawScore: doublePrecision("raw_score").notNull(),
  confidence: integer("confidence").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  errorCategory: text("error_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("objective_attempts_user_target_created_idx").on(table.userId, table.examTargetId, table.createdAt),
  index("objective_attempts_user_question_idx").on(table.userId, table.questionId),
]);

export const knowledgeReviews = pgTable("knowledge_reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  knowledgeNodeId: text("knowledge_node_id").notNull().references(() => knowledgeNodes.id),
  questionId: text("question_id").references(() => questionBank.id),
  reason: text("reason").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("knowledge_reviews_user_due_idx").on(table.userId, table.completedAt, table.scheduledFor)]);

export const learningErrors = pgTable("learning_errors", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  attemptId: text("attempt_id").notNull().references(() => objectiveAttempts.id),
  questionId: text("question_id").notNull().references(() => questionBank.id),
  knowledgeNodeId: text("knowledge_node_id").notNull().references(() => knowledgeNodes.id),
  category: text("category").notNull(),
  suggestedCategory: text("suggested_category").notNull(),
  confidence: integer("confidence").notNull(),
  suspectedMisconception: text("suspected_misconception"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("learning_errors_user_due_idx").on(table.userId, table.resolvedAt, table.nextReviewAt)]);

export const objectiveSessions = pgTable("objective_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  examTargetId: text("exam_target_id").notNull().references(() => examTargets.id),
  sessionType: text("session_type").notNull(),
  questionIdsJson: text("question_ids_json").notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("objective_sessions_user_target_status_idx").on(table.userId, table.examTargetId, table.sessionType, table.status, table.updatedAt)]);
