import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { knowledgeMastery, knowledgeReviews, learningErrors, objectiveAttempts, objectiveSessions } from "@/db/schema";
import { classifyObjectiveError, scoreObjective, updateKnowledgeMastery } from "@/lib/adaptive-engine.mjs";
import { ensurePoliceCatalog } from "@/lib/police-context";
import { getPoliceProgramByTargetId, getPoliceQuestion } from "@/lib/police-data";
import { ensureLocalUser, LOCAL_USER_ID } from "@/lib/user-context";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { sessionId?: string; questionId?: string; answer?: boolean | null; confidence?: number; durationSeconds?: number };
    const question = payload.questionId ? getPoliceQuestion(payload.questionId) : null;
    if (!question || !payload.sessionId) return Response.json({ error: "Questão ou sessão inválida" }, { status: 400 });
    const confidence = Math.max(1, Math.min(5, Number(payload.confidence) || 3));
    const answer = typeof payload.answer === "boolean" ? payload.answer : null;
    const isCorrect = answer === question.correctAnswer;
    const category = classifyObjectiveError({ isCorrect, confidence });
    const db = getDb();
    const now = new Date();
    await ensureLocalUser(db, now);
    await ensurePoliceCatalog(db, now);
    const [session] = await db.select().from(objectiveSessions).where(and(eq(objectiveSessions.id, payload.sessionId), eq(objectiveSessions.userId, LOCAL_USER_ID))).limit(1);
    if (!session || session.status !== "active") return Response.json({ error: "A sessão não está ativa" }, { status: 409 });
    const program = getPoliceProgramByTargetId(session.examTargetId);
    if (!program || !program.questions.some((item) => item.id === question.id)) return Response.json({ error: "Questão fora do objetivo ativo" }, { status: 400 });
    const rawScore = scoreObjective({ strategy: program.notice.objectiveExam.scoringStrategy, answer, correctAnswer: question.correctAnswer });
    const attemptId = crypto.randomUUID();
    await db.insert(objectiveAttempts).values({ id: attemptId, userId: LOCAL_USER_ID, examTargetId: session.examTargetId, questionId: question.id, sessionType: session.sessionType, answerJson: JSON.stringify(answer), isCorrect, rawScore, confidence, durationSeconds: Math.max(0, Math.min(3600, Number(payload.durationSeconds) || 0)), errorCategory: category, createdAt: now });
    let earliestReviewMs = Number.POSITIVE_INFINITY;
    for (const nodeId of question.topicIds) {
      const [prior] = await db.select().from(knowledgeMastery).where(and(eq(knowledgeMastery.userId, LOCAL_USER_ID), eq(knowledgeMastery.knowledgeNodeId, nodeId))).limit(1);
      const next = updateKnowledgeMastery({ priorMastery: prior?.mastery ?? 0, priorStability: prior?.stabilityDays ?? 0.5, evidenceCount: prior?.evidenceCount ?? 0, isCorrect, confidence, difficulty: question.difficulty, now });
      earliestReviewMs = Math.min(earliestReviewMs, next.nextReviewAt.getTime());
      await db.insert(knowledgeMastery).values({ id: prior?.id ?? crypto.randomUUID(), userId: LOCAL_USER_ID, knowledgeNodeId: nodeId, mastery: next.mastery, stabilityDays: next.stabilityDays, evidenceCount: next.evidenceCount, state: next.state, nextReviewAt: next.nextReviewAt, lastReviewedAt: now, updatedAt: now }).onConflictDoUpdate({ target: [knowledgeMastery.userId, knowledgeMastery.knowledgeNodeId], set: { mastery: next.mastery, stabilityDays: next.stabilityDays, evidenceCount: next.evidenceCount, state: next.state, nextReviewAt: next.nextReviewAt, lastReviewedAt: now, updatedAt: now } });
      await db.insert(knowledgeReviews).values({ id: crypto.randomUUID(), userId: LOCAL_USER_ID, knowledgeNodeId: nodeId, questionId: question.id, reason: isCorrect ? "spaced-repetition" : category ?? "error", scheduledFor: next.nextReviewAt, completedAt: null, createdAt: now });
      if (!isCorrect && nodeId === question.topicIds[0]) await db.insert(learningErrors).values({ id: crypto.randomUUID(), userId: LOCAL_USER_ID, attemptId, questionId: question.id, knowledgeNodeId: nodeId, category: category ?? "knowledge-gap", suggestedCategory: category ?? "knowledge-gap", confidence, suspectedMisconception: question.misconception, nextReviewAt: next.nextReviewAt, resolvedAt: null, createdAt: now, updatedAt: now });
    }
    const ids = JSON.parse(session.questionIdsJson) as string[];
    const nextIndex = Math.min(ids.length, session.currentIndex + 1);
    const complete = nextIndex >= ids.length;
    await db.update(objectiveSessions).set({ currentIndex: nextIndex, status: complete ? "completed" : "active", updatedAt: now, completedAt: complete ? now : null }).where(eq(objectiveSessions.id, session.id));
    return Response.json({
      attempt: { id: attemptId, answer, correctAnswer: question.correctAnswer, isCorrect, rawScore, confidence, category },
      feedback: { explanation: question.explanation, decisionPoint: question.decisionPoint, misconception: question.misconception, source: question.source, isOfficial: question.isOfficial },
      review: { nextReviewAt: Number.isFinite(earliestReviewMs) ? new Date(earliestReviewMs).toISOString() : null, reason: !isCorrect && confidence >= 4 ? "Erro com alta confiança: revisão antecipada" : isCorrect ? "Revisão espaçada" : "Erro registrado" },
      session: { complete, currentIndex: nextIndex, total: ids.length, nextQuestion: complete ? null : getPoliceQuestion(ids[nextIndex]) },
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a resposta" }, { status: 500 });
  }
}
