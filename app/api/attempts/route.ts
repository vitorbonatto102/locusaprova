import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attempts, errorLog, mastery } from "@/db/schema";
import exercises from "@/data/exercises.json";
import units from "@/data/exam-units.json";
import confusionPairs from "@/data/confusion-pairs.json";
import adaptiveDrills from "@/data/oab-penal/adaptive-drills.json";
import { resolveTrainingItem } from "@/lib/corpus.mjs";
import { classifyError, evaluateRubric, scheduleReview } from "@/lib/learning.mjs";
import { ensureUser, getActiveTrackId } from "@/lib/user-context";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth";

function message(error: unknown) {
  const text = error instanceof Error ? error.message : "Erro inesperado";
  return text.includes("no such table") ? "O banco ainda não recebeu as migrações. Publique novamente para aplicá-las." : text;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const db = getDb();
    const trackId = await getActiveTrackId(db, USER_ID);
    const rows = await db.select().from(attempts).where(and(eq(attempts.userId, USER_ID), eq(attempts.trackId, trackId))).orderBy(desc(attempts.createdAt)).limit(30);
    return Response.json({ attempts: rows });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const payload = await request.json() as { exerciseId?: string; answer?: string; confidence?: number; durationSeconds?: number };
    const legacy = exercises.find((item) => item.id === payload.exerciseId);
    const generated = payload.exerciseId ? resolveTrainingItem(payload.exerciseId, units, confusionPairs, exercises, adaptiveDrills) : null;
    const exercise = generated ?? legacy;
    if (!exercise || !payload.answer?.trim()) return Response.json({ error: "Exercício e resposta são obrigatórios." }, { status: 400 });
    const confidence = Math.max(1, Math.min(5, Number(payload.confidence) || 3));
    const evaluation = evaluateRubric(payload.answer, exercise.rubric, exercise.answer);
    const category = classifyError(evaluation, confidence);
    const now = new Date();
    const skillIds = generated?.skillIds?.length ? generated.skillIds : [exercise.id];
    const db = getDb();

    await ensureUser(db, user, now);
    const trackId = await getActiveTrackId(db, USER_ID);
    const schedules = [];
    for (const skillId of skillIds) {
      const masteryId = `${USER_ID}:${trackId}:${skillId}`;
      const [prior] = await db.select().from(mastery).where(and(eq(mastery.userId, USER_ID), eq(mastery.trackId, trackId), eq(mastery.skillId, skillId))).limit(1);
      const schedule = scheduleReview({ previousStability: prior?.stabilityDays ?? 1, previousMastery: prior?.mastery ?? 0, ratio: evaluation.ratio, confidence, now });
      schedules.push({ skillId, ...schedule });
      await db.insert(mastery).values({
        id: prior?.id ?? masteryId, userId: USER_ID, trackId, skillId, mastery: schedule.mastery,
        stabilityDays: schedule.stabilityDays, state: schedule.state, nextReviewAt: schedule.nextReviewAt, lastReviewedAt: now,
      }).onConflictDoUpdate({ target: mastery.id, set: { mastery: schedule.mastery, stabilityDays: schedule.stabilityDays, state: schedule.state, nextReviewAt: schedule.nextReviewAt, lastReviewedAt: now } });
    }
    const schedule = schedules.reduce((earliest, item) => !earliest || item.nextReviewAt < earliest.nextReviewAt ? item : earliest, schedules[0]);

    await db.insert(attempts).values({
      id: crypto.randomUUID(), userId: USER_ID, trackId, exerciseId: exercise.id, thesisId: generated?.thesisIds?.[0] ?? null, kind: exercise.kind,
      answer: payload.answer.trim(), score: evaluation.score, maxScore: evaluation.maxScore,
      confidence, durationSeconds: Math.max(0, Number(payload.durationSeconds) || 0),
      feedbackJson: JSON.stringify(evaluation), createdAt: now,
    });

    if (evaluation.ratio < 0.8) {
      await db.insert(errorLog).values({
        id: crypto.randomUUID(), userId: USER_ID, trackId, exerciseId: exercise.id, thesisId: generated?.thesisIds?.[0] ?? null, category, confidence,
        excerpt: payload.answer.trim().slice(0, 280), resolved: false, nextReviewAt: schedule.nextReviewAt, createdAt: now,
      });
    } else {
      await db.update(errorLog).set({ resolved: true }).where(and(eq(errorLog.userId, USER_ID), eq(errorLog.trackId, trackId), eq(errorLog.exerciseId, exercise.id), eq(errorLog.resolved, false)));
    }
    const pointsLeft = Math.max(0, Math.round((evaluation.maxScore - evaluation.score) * 100) / 100);
    const correctiveActivity = category === "erro-de-alta-confianca" ? "Não Confunda" : category === "fundamentacao" ? "Complete a Fundamentação" : category === "consequencia-pedido" ? "Fato → tese → pedido" : "Caça à Tese";
    return Response.json({ evaluation, pointsLeft, correctiveActivity, skillSchedules: schedules.map((item) => ({ ...item, nextReviewAt: item.nextReviewAt.toISOString() })), schedule: { ...schedule, nextReviewAt: schedule.nextReviewAt.toISOString() }, category }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
