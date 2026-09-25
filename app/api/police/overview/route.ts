import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { knowledgeMastery, knowledgeReviews, learningErrors, objectiveAttempts, objectiveSessions } from "@/db/schema";
import { aggregateKnowledgeTree, buildAdaptivePlan, buildReviewCards, countKnowledgeTree, overlapExamTargets } from "@/lib/adaptive-engine.mjs";
import { ensurePoliceCatalog, getActivePoliceProgram } from "@/lib/police-context";
import { PF_TARGET_ID, policeTargets } from "@/lib/police-data";
import { ensureLocalUser, LOCAL_USER_ID } from "@/lib/user-context";

export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    await ensureLocalUser(db, now);
    await ensurePoliceCatalog(db, now);
    const program = await getActivePoliceProgram(db);
    const target = policeTargets.targets.find((item) => item.id === program.targetId)!;
    const topicIds = new Set(target.knowledgeNodeIds);
    const questionIds = new Set(program.questions.map((question) => question.id));
    const [mastery, reviews, attempts, errors, [diagnostic]] = await Promise.all([
      db.select().from(knowledgeMastery).where(eq(knowledgeMastery.userId, LOCAL_USER_ID)),
      db.select().from(knowledgeReviews).where(and(eq(knowledgeReviews.userId, LOCAL_USER_ID), isNull(knowledgeReviews.completedAt))).orderBy(knowledgeReviews.scheduledFor),
      db.select().from(objectiveAttempts).where(and(eq(objectiveAttempts.userId, LOCAL_USER_ID), eq(objectiveAttempts.examTargetId, program.targetId))).orderBy(desc(objectiveAttempts.createdAt)).limit(80),
      db.select().from(learningErrors).where(and(eq(learningErrors.userId, LOCAL_USER_ID), isNull(learningErrors.resolvedAt))).orderBy(learningErrors.nextReviewAt),
      db.select().from(objectiveSessions).where(and(eq(objectiveSessions.userId, LOCAL_USER_ID), eq(objectiveSessions.examTargetId, program.targetId), eq(objectiveSessions.sessionType, "diagnostic"))).orderBy(desc(objectiveSessions.updatedAt)).limit(1),
    ]);
    const relevantReviews = reviews.filter((review) => topicIds.has(review.knowledgeNodeId));
    const relevantErrors = errors.filter((error) => questionIds.has(error.questionId));
    const plan = buildAdaptivePlan({ questions: program.questions, mastery, reviews: relevantReviews, attempts, minutes: 30, now });
    const score = attempts.reduce((total, attempt) => total + attempt.rawScore, 0);
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    const measured = mastery.filter((row) => row.evidenceCount > 0);
    const dueCount = relevantReviews.filter((review) => review.scheduledFor <= now).length;
    const reference = policeTargets.targets.find((item) => item.id === (program.targetId === PF_TARGET_ID ? "prf-2021" : PF_TARGET_ID))!;
    const overlap = overlapExamTargets(reference, target);
    const nodeNames = new Map(program.notice.knowledgeTree.flatMap((subject) => subject.topics.map((topic) => [topic.id, topic.name])));
    const reviewCards = buildReviewCards({ tree: program.notice.knowledgeTree, questions: program.questions, mastery, reviews: relevantReviews, errors: relevantErrors, now });
    return Response.json({
      target: { id: program.targetId, label: target.label, board: program.notice.board, year: "year" in program.notice ? program.notice.year : 2025, referenceLabel: "referenceLabel" in program.notice ? program.notice.referenceLabel : target.label },
      notice: {
        title: program.notice.title, sourceUrl: program.notice.source.sourceUrl, totalItems: program.notice.objectiveExam.totalItems,
        durationMinutes: program.notice.objectiveExam.durationMinutes, blocks: program.notice.objectiveExam.blocks,
        minimumTotalScore: program.notice.objectiveExam.minimumTotalScore, discursive: program.notice.discursiveExam,
        subjects: program.notice.subjectsInNotice, stages: program.notice.stages, scoring: program.notice.objectiveExam.scoring,
      },
      diagnostic: { status: diagnostic?.status ?? "not_started", currentIndex: diagnostic?.currentIndex ?? 0, total: diagnostic ? JSON.parse(diagnostic.questionIdsJson).length : Math.min(20, program.questions.length) },
      stats: {
        attempts: attempts.length, correct, rawScore: score, dueReviews: dueCount, openErrors: relevantErrors.length,
        measuredTopics: measured.length,
        observedMastery: measured.length ? measured.reduce((sum, row) => sum + row.mastery, 0) / measured.length : null,
      },
      knowledge: { counts: countKnowledgeTree(program.notice.knowledgeTree), subjects: aggregateKnowledgeTree(program.notice.knowledgeTree, mastery) },
      plan: plan.map((entry: { question: { id: string; subjectId: string; topicIds: string[] }; reason: string }) => ({ questionId: entry.question.id, subjectId: entry.question.subjectId, topicIds: entry.question.topicIds, reason: entry.reason })),
      reviewCards,
      comparison: { referenceTarget: reference.label, currentTarget: target.label, overlapRatio: overlap.overlapRatio, shared: overlap.shared.map((id: string) => ({ id, name: nodeNames.get(id) ?? id })), newNodes: overlap.newNodes.map((id: string) => ({ id, name: nodeNames.get(id) ?? id })), noLongerRequired: overlap.noLongerRequired },
      errors: relevantErrors.slice(0, 6),
    }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Resumo indisponível" }, { status: 500 });
  }
}
