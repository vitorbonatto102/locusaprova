import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attempts, errorLog, mastery } from "@/db/schema";
import confusionPairs from "@/data/confusion-pairs.json";
import adaptiveDrills from "@/data/oab-penal/adaptive-drills.json";
import { buildDailyPlan } from "@/lib/corpus.mjs";
import { ACTIVE_TRACK_ID } from "@/lib/study-track";
import { getActiveTrackId, LOCAL_USER_ID } from "@/lib/user-context";

const USER_ID = LOCAL_USER_ID;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const minutes = Math.max(10, Math.min(60, Number(url.searchParams.get("minutes")) || 30));
  const requestedDate = url.searchParams.get("date");
  const date = requestedDate ? new Date(`${requestedDate}T12:00:00Z`) : new Date();
  let masteryRows: unknown[] = [];
  let errorRows: unknown[] = [];
  let attemptRows: unknown[] = [];
  let trackId = ACTIVE_TRACK_ID;
  try {
    const db = getDb();
    trackId = await getActiveTrackId(db);
    [masteryRows, errorRows, attemptRows] = await Promise.all([
      db.select().from(mastery).where(and(eq(mastery.userId, USER_ID), eq(mastery.trackId, trackId))),
      db.select().from(errorLog).where(and(eq(errorLog.userId, USER_ID), eq(errorLog.trackId, trackId))).orderBy(desc(errorLog.createdAt)).limit(80),
      db.select({ exerciseId: attempts.exerciseId, createdAt: attempts.createdAt }).from(attempts)
        .where(and(eq(attempts.userId, USER_ID), eq(attempts.trackId, trackId))).orderBy(desc(attempts.createdAt)).limit(80),
    ]);
  } catch {
    // O primeiro plano também funciona antes da criação do histórico no D1.
  }
  const plan = buildDailyPlan({ adaptiveDrills, confusionPairs, mastery: masteryRows, errors: errorRows, recentAttempts: attemptRows, minutes, date });
  return Response.json(plan, { headers: { "cache-control": "no-store, max-age=0" } });
}
