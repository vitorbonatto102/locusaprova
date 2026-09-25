import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyGoals, userExamTargets, users } from "@/db/schema";
import { getStudyTrack } from "@/lib/study-track";
import { ensurePoliceCatalog } from "@/lib/police-context";
import { getPoliceProgramByTrackId } from "@/lib/police-data";
import { ensureUser } from "@/lib/user-context";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth";

function serializeGoal(goal: typeof studyGoals.$inferSelect | undefined) {
  if (!goal) return null;
  let difficulties: string[] = [];
  try {
    const parsed = JSON.parse(goal.selfReportedDifficultyJson);
    if (Array.isArray(parsed)) difficulties = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    difficulties = [];
  }
  return { id: goal.id, trackId: goal.trackId, examDate: goal.examDate, dailyMinutes: goal.dailyMinutes, difficulties };
}

export async function GET() {
  const userIdentity = await getAuthenticatedUser();
  if (!userIdentity) return unauthorized();
  const USER_ID = userIdentity.id;
  try {
    const db = getDb();
    const now = new Date();
    await ensureUser(db, userIdentity, now);
    const [[user], [goal], [target]] = await Promise.all([
      db.select().from(users).where(eq(users.id, USER_ID)).limit(1),
      db.select().from(studyGoals).where(and(eq(studyGoals.userId, USER_ID), eq(studyGoals.status, "active"))).orderBy(desc(studyGoals.updatedAt)).limit(1),
      db.select().from(userExamTargets).where(and(eq(userExamTargets.userId, USER_ID), eq(userExamTargets.isPrimary, true))).orderBy(desc(userExamTargets.updatedAt)).limit(1),
    ]);
    return Response.json({
      profile: {
        name: user.name,
        activeTrackId: user.activeTrackId,
        goalDate: user.goalDate,
        dailyMinutes: user.dailyMinutes,
        onboardingComplete: Boolean(user.onboardingCompletedAt),
        experienceLevel: target?.experienceLevel ?? "starting",
        goal: serializeGoal(goal),
      },
    }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Perfil indisponível" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userIdentity = await getAuthenticatedUser();
  if (!userIdentity) return unauthorized();
  const USER_ID = userIdentity.id;
  try {
    const payload = await request.json() as { trackId?: string; examDate?: string | null; dailyMinutes?: number; difficulties?: string[]; experienceLevel?: string };
    const track = payload.trackId ? getStudyTrack(payload.trackId) : null;
    if (!track) return Response.json({ error: "Percurso de estudo inválido." }, { status: 400 });
    if (track.contentStatus !== "complete") return Response.json({ error: "Este percurso está estruturado, mas ainda não possui conteúdo validado.", code: "TRACK_NOT_READY", track }, { status: 409 });

    const dailyMinutes = Math.max(10, Math.min(240, Number(payload.dailyMinutes) || 30));
    const examDate = typeof payload.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.examDate) ? payload.examDate : null;
    const allowedDifficulties = new Set(track.difficultyOptions);
    const difficulties = [...new Set(payload.difficulties ?? [])].filter((item) => allowedDifficulties.has(item)).slice(0, 10);
    const db = getDb();
    const now = new Date();
    await ensureUser(db, userIdentity, now);
    const policeProgram = getPoliceProgramByTrackId(track.id);
    if (policeProgram) {
      await ensurePoliceCatalog(db, now);
      await db.update(userExamTargets).set({ isPrimary: false, updatedAt: now }).where(eq(userExamTargets.userId, USER_ID));
      const experienceLevel = ["starting", "studying", "advanced"].includes(payload.experienceLevel ?? "") ? payload.experienceLevel! : "starting";
      await db.insert(userExamTargets).values({ id: crypto.randomUUID(), userId: USER_ID, examTargetId: policeProgram.targetId, isPrimary: true, status: "active", experienceLevel, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [userExamTargets.userId, userExamTargets.examTargetId], set: { isPrimary: true, status: "active", experienceLevel, updatedAt: now } });
    }
    await db.update(studyGoals).set({ status: "inactive", updatedAt: now }).where(and(eq(studyGoals.userId, USER_ID), eq(studyGoals.status, "active")));
    const goalId = crypto.randomUUID();
    await db.insert(studyGoals).values({
      id: goalId,
      userId: USER_ID,
      trackId: track.id,
      examDate,
      dailyMinutes,
      selfReportedDifficultyJson: JSON.stringify(difficulties),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await db.update(users).set({
      activeTrackId: track.id,
      goalDate: examDate,
      dailyMinutes,
      weeklyMinutes: dailyMinutes * 5,
      onboardingCompletedAt: now,
    }).where(eq(users.id, USER_ID));
    return Response.json({ profile: { activeTrackId: track.id, goalDate: examDate, dailyMinutes, experienceLevel: payload.experienceLevel ?? "starting", onboardingComplete: true, goal: { id: goalId, trackId: track.id, examDate, dailyMinutes, difficulties } }, track }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o objetivo." }, { status: 500 });
  }
}
