import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { knowledgeMastery, knowledgeReviews, objectiveAttempts, objectiveSessions } from "@/db/schema";
import { buildAdaptivePlan, buildDiagnosticQuestions } from "@/lib/adaptive-engine.mjs";
import { ensurePoliceCatalog, getActivePoliceProgram } from "@/lib/police-context";
import { getPoliceQuestion } from "@/lib/police-data";
import { ensureLocalUser, LOCAL_USER_ID } from "@/lib/user-context";

function serializeSession(session: typeof objectiveSessions.$inferSelect) {
  const questionIds = JSON.parse(session.questionIdsJson) as string[];
  const currentIndex = Math.min(session.currentIndex, questionIds.length - 1);
  return {
    id: session.id, mode: session.sessionType, status: session.status, currentIndex: session.currentIndex,
    total: questionIds.length, question: getPoliceQuestion(questionIds[currentIndex] ?? ""),
    canGoBack: session.currentIndex > 0,
  };
}

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("mode");
    const mode = requested === "diagnostic" ? "diagnostic" : requested === "review" ? "review" : "daily";
    const db = getDb();
    await ensureLocalUser(db);
    await ensurePoliceCatalog(db);
    const program = await getActivePoliceProgram(db);
    const [active] = await db.select().from(objectiveSessions).where(and(
      eq(objectiveSessions.userId, LOCAL_USER_ID), eq(objectiveSessions.examTargetId, program.targetId),
      eq(objectiveSessions.sessionType, mode), eq(objectiveSessions.status, "active"),
    )).orderBy(desc(objectiveSessions.updatedAt)).limit(1);
    return Response.json({ session: active ? serializeSession(active) : null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sessão indisponível" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { mode?: string; minutes?: number; restart?: boolean; topicId?: string };
    const mode = payload.mode === "diagnostic" ? "diagnostic" : payload.mode === "review" ? `review:${payload.topicId ?? "all"}` : "daily";
    const db = getDb();
    const now = new Date();
    await ensureLocalUser(db, now);
    await ensurePoliceCatalog(db, now);
    const program = await getActivePoliceProgram(db);
    if (!payload.restart) {
      const [active] = await db.select().from(objectiveSessions).where(and(eq(objectiveSessions.userId, LOCAL_USER_ID), eq(objectiveSessions.examTargetId, program.targetId), eq(objectiveSessions.sessionType, mode), eq(objectiveSessions.status, "active"))).orderBy(desc(objectiveSessions.updatedAt)).limit(1);
      if (active) return Response.json({ session: serializeSession(active), resumed: true });
    }
    if (payload.restart) await db.update(objectiveSessions).set({ status: "abandoned", updatedAt: now }).where(and(eq(objectiveSessions.userId, LOCAL_USER_ID), eq(objectiveSessions.examTargetId, program.targetId), eq(objectiveSessions.sessionType, mode), eq(objectiveSessions.status, "active")));
    let selected = buildDiagnosticQuestions(program.questions, 20);
    if (mode === "daily") {
      const [mastery, reviews, attempts] = await Promise.all([
        db.select().from(knowledgeMastery).where(eq(knowledgeMastery.userId, LOCAL_USER_ID)),
        db.select().from(knowledgeReviews).where(eq(knowledgeReviews.userId, LOCAL_USER_ID)),
        db.select().from(objectiveAttempts).where(and(eq(objectiveAttempts.userId, LOCAL_USER_ID), eq(objectiveAttempts.examTargetId, program.targetId))).orderBy(desc(objectiveAttempts.createdAt)).limit(80),
      ]);
      selected = buildAdaptivePlan({ questions: program.questions, mastery, reviews, attempts, minutes: Math.max(10, Math.min(120, payload.minutes ?? 30)), now }).map((entry: { question: (typeof program.questions)[number] }) => entry.question);
    }
    if (mode.startsWith("review:")) {
      const pool = payload.topicId ? program.questions.filter((question) => question.topicIds.includes(payload.topicId!)) : program.questions;
      selected = buildDiagnosticQuestions(pool, Math.min(6, Math.max(3, pool.length)));
    }
    if (!selected.length) return Response.json({ error: "Ainda não há itens curados para este tópico" }, { status: 422 });
    const id = crypto.randomUUID();
    const session = { id, userId: LOCAL_USER_ID, examTargetId: program.targetId, sessionType: mode, questionIdsJson: JSON.stringify(selected.map((question) => question.id)), currentIndex: 0, status: "active", createdAt: now, updatedAt: now, completedAt: null };
    await db.insert(objectiveSessions).values(session);
    return Response.json({ session: serializeSession(session), resumed: false }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar a sessão" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as { sessionId?: string; index?: number };
    if (!payload.sessionId || !Number.isInteger(payload.index) || Number(payload.index) < 0) return Response.json({ error: "Navegação inválida" }, { status: 400 });
    const db = getDb();
    const [session] = await db.select().from(objectiveSessions).where(and(eq(objectiveSessions.id, payload.sessionId), eq(objectiveSessions.userId, LOCAL_USER_ID))).limit(1);
    if (!session) return Response.json({ error: "Sessão não encontrada" }, { status: 404 });
    const ids = JSON.parse(session.questionIdsJson) as string[];
    const index = Math.min(Number(payload.index), Math.max(0, ids.length - 1));
    await db.update(objectiveSessions).set({ currentIndex: index, updatedAt: new Date() }).where(eq(objectiveSessions.id, session.id));
    return Response.json({ session: serializeSession({ ...session, currentIndex: index }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Navegação indisponível" }, { status: 500 });
  }
}
