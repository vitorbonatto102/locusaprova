import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trainingSessions } from "@/db/schema";
import confusionPairs from "@/data/confusion-pairs.json";
import adaptiveDrills from "@/data/oab-penal/adaptive-drills.json";
import { resolveAdaptiveTrainingItem } from "@/lib/corpus.mjs";
import { ensureUser, getActiveTrackId } from "@/lib/user-context";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth";

type SessionRow = typeof trainingSessions.$inferSelect;
type SavedActivityState = { draftAnswer: string; confidence: number; phase: "answering" | "feedback"; feedback: unknown };

function parseActivityIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseActivityStates(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, SavedActivityState> : {};
  } catch {
    return {};
  }
}

function serializeSession(row: SessionRow) {
  const activityIds = parseActivityIds(row.activityIdsJson);
  const activities = activityIds.map((id) => resolveAdaptiveTrainingItem(id, confusionPairs, adaptiveDrills)).filter(Boolean);
  const currentIndex = Math.min(Math.max(0, row.currentIndex), Math.max(0, activities.length - 1));
  const savedState = parseActivityStates(row.activityStatesJson)[activityIds[currentIndex]];
  let feedback = savedState?.feedback ?? null;
  if (row.feedbackJson) {
    try { feedback ??= JSON.parse(row.feedbackJson); } catch { feedback = null; }
  }
  return {
    id: row.id,
    planDate: row.planDate,
    requestedMinutes: row.requestedMinutes,
    activityIds,
    activities,
    currentIndex,
    draftAnswer: savedState?.draftAnswer ?? row.draftAnswer,
    confidence: savedState?.confidence ?? row.confidence,
    phase: savedState?.phase ?? row.phase,
    feedback,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function activeSession(trackId: string, userId: string) {
  const db = getDb();
  const [session] = await db.select().from(trainingSessions)
    .where(and(eq(trainingSessions.userId, userId), eq(trainingSessions.trackId, trackId), eq(trainingSessions.status, "active")))
    .orderBy(desc(trainingSessions.updatedAt)).limit(1);
  return session ?? null;
}

function isCurrentAdaptiveSession(row: SessionRow) {
  const ids = parseActivityIds(row.activityIdsJson);
  return ids.length > 0 && ids.every((id) => resolveAdaptiveTrainingItem(id, confusionPairs, adaptiveDrills));
}

async function retireLegacySession(row: SessionRow, userId: string) {
  const db = getDb();
  await db.update(trainingSessions).set({ status: "superseded", updatedAt: new Date() })
    .where(and(eq(trainingSessions.id, row.id), eq(trainingSessions.userId, userId)));
}

function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "Erro inesperado";
  return text.includes("no such table")
    ? "O banco ainda não recebeu a migração das sessões de treino."
    : text;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const db = getDb();
    const trackId = await getActiveTrackId(db, USER_ID);
    const session = await activeSession(trackId, USER_ID);
    if (session && !isCurrentAdaptiveSession(session)) {
      await retireLegacySession(session, USER_ID);
      return Response.json({ session: null, replacedLegacySession: true }, { headers: { "cache-control": "no-store, max-age=0" } });
    }
    return Response.json({ session: session ? serializeSession(session) : null }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const payload = await request.json() as {
      action?: "start" | "progress" | "complete";
      sessionId?: string;
      planDate?: string;
      requestedMinutes?: number;
      activityIds?: string[];
      currentIndex?: number;
      draftAnswer?: string;
      confidence?: number;
      phase?: "answering" | "feedback";
      feedback?: unknown;
      navigateToIndex?: number;
    };
    const db = getDb();
    const now = new Date();

    await ensureUser(db, user, now);
    const trackId = await getActiveTrackId(db, USER_ID);

    if (payload.action === "start") {
      const current = await activeSession(trackId, USER_ID);
      if (current && isCurrentAdaptiveSession(current)) return Response.json({ session: serializeSession(current), resumed: true });
      if (current) await retireLegacySession(current, USER_ID);

      const activityIds = [...new Set(payload.activityIds ?? [])]
        .filter((id) => typeof id === "string" && resolveAdaptiveTrainingItem(id, confusionPairs, adaptiveDrills));
      if (!activityIds.length) return Response.json({ error: "A sessão precisa ter ao menos uma atividade válida." }, { status: 400 });

      const session: typeof trainingSessions.$inferInsert = {
        id: crypto.randomUUID(),
        userId: USER_ID,
        trackId,
        planDate: payload.planDate ?? now.toISOString().slice(0, 10),
        requestedMinutes: Math.max(10, Math.min(60, Number(payload.requestedMinutes) || 30)),
        activityIdsJson: JSON.stringify(activityIds),
        currentIndex: 0,
        draftAnswer: "",
        confidence: 3,
        phase: "answering",
        feedbackJson: null,
        activityStatesJson: "{}",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(trainingSessions).values(session);
      const [created] = await db.select().from(trainingSessions).where(and(eq(trainingSessions.id, session.id), eq(trainingSessions.userId, USER_ID))).limit(1);
      return Response.json({ session: serializeSession(created), resumed: false }, { status: 201 });
    }

    if (!payload.sessionId) return Response.json({ error: "Sessão não informada." }, { status: 400 });
    const [session] = await db.select().from(trainingSessions)
      .where(and(eq(trainingSessions.id, payload.sessionId), eq(trainingSessions.userId, USER_ID), eq(trainingSessions.trackId, trackId), eq(trainingSessions.status, "active"))).limit(1);
    if (!session) return Response.json({ error: "Sessão ativa não encontrada." }, { status: 404 });

    if (payload.action === "complete") {
      await db.update(trainingSessions).set({ status: "completed", completedAt: now, updatedAt: now })
        .where(and(eq(trainingSessions.id, session.id), eq(trainingSessions.userId, USER_ID), eq(trainingSessions.trackId, trackId)));
      return Response.json({ completed: true });
    }

    if (payload.action === "progress") {
      const activityIds = parseActivityIds(session.activityIdsJson);
      const activityCount = activityIds.length;
      const currentIndex = Math.min(Math.max(0, Number(payload.currentIndex) || 0), Math.max(0, activityCount - 1));
      const confidence = Math.max(1, Math.min(5, Number(payload.confidence) || 3));
      const phase = payload.phase === "feedback" ? "feedback" : "answering";
      const activityStates = parseActivityStates(session.activityStatesJson);
      activityStates[activityIds[currentIndex]] = { draftAnswer: String(payload.draftAnswer ?? ""), confidence, phase, feedback: phase === "feedback" ? payload.feedback ?? null : null };
      const requestedIndex = payload.navigateToIndex === undefined ? currentIndex : Number(payload.navigateToIndex);
      const targetIndex = Math.min(Math.max(0, requestedIndex || 0), Math.max(0, activityCount - 1));
      const targetState = activityStates[activityIds[targetIndex]] ?? { draftAnswer: "", confidence: 3, phase: "answering" as const, feedback: null };
      await db.update(trainingSessions).set({
        currentIndex: targetIndex,
        draftAnswer: targetState.draftAnswer,
        confidence: targetState.confidence,
        phase: targetState.phase,
        feedbackJson: targetState.phase === "feedback" && targetState.feedback ? JSON.stringify(targetState.feedback) : null,
        activityStatesJson: JSON.stringify(activityStates),
        updatedAt: now,
      }).where(and(eq(trainingSessions.id, session.id), eq(trainingSessions.userId, USER_ID), eq(trainingSessions.trackId, trackId)));
      const [updated] = await db.select().from(trainingSessions).where(and(eq(trainingSessions.id, session.id), eq(trainingSessions.userId, USER_ID))).limit(1);
      return Response.json({ session: serializeSession(updated) });
    }

    return Response.json({ error: "Ação de sessão inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
