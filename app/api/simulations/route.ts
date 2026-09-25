import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { simulations } from "@/db/schema";
import units from "@/data/exam-units.json";
import { rubricForUnit } from "@/lib/corpus.mjs";
import { evaluateRubric } from "@/lib/learning.mjs";
import { evaluateSelfAssessment } from "@/lib/simulation.mjs";
import { ensureLocalUser, getActiveTrackId, LOCAL_USER_ID } from "@/lib/user-context";

const USER_ID = LOCAL_USER_ID;

export async function GET() {
  try {
    const db = getDb();
    const trackId = await getActiveTrackId(db);
    const rows = await db.select().from(simulations).where(and(eq(simulations.userId, USER_ID), eq(simulations.trackId, trackId))).orderBy(desc(simulations.createdAt)).limit(20);
    return Response.json({ simulations: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Histórico indisponível" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { examNumber?: number; durationSeconds?: number; answers?: Record<string, string>; selfAssessment?: Record<string, number[]> };
    const examUnits = units.filter((unit) => unit.exam_number === Number(payload.examNumber));
    if (examUnits.length !== 5) return Response.json({ error: "Prova oficial inválida." }, { status: 400 });
    const answers = payload.answers ?? {};
    const corrections = examUnits.map((unit) => {
      const rubric = rubricForUnit(unit);
      const selected = payload.selfAssessment?.[unit.id];
      return { unitId: unit.id, evaluation: Array.isArray(selected) ? evaluateSelfAssessment(rubric, selected) : evaluateRubric(answers[unit.id] ?? "", rubric) };
    });
    const totalScore = corrections.reduce((sum, item) => sum + item.evaluation.score, 0);
    const maxScore = corrections.reduce((sum, item) => sum + item.evaluation.maxScore, 0);
    const db = getDb();
    const now = new Date();
    await ensureLocalUser(db, now);
    const trackId = await getActiveTrackId(db);
    const id = crypto.randomUUID();
    await db.insert(simulations).values({ id, userId: USER_ID, trackId, examId: examUnits[0].exam_id, durationSeconds: Math.max(0, Number(payload.durationSeconds) || 0), totalScore, maxScore, answersJson: JSON.stringify(answers), correctionJson: JSON.stringify(corrections), createdAt: now });
    return Response.json({ id, totalScore, maxScore }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, { status: 500 });
  }
}
