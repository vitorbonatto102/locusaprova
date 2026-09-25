import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ACTIVE_TRACK_ID, getStudyTrack } from "@/lib/study-track";

export const LOCAL_USER_ID = "local-learner";

export async function ensureLocalUser(db: ReturnType<typeof getDb>, now = new Date()) {
  await db.insert(users).values({
    id: LOCAL_USER_ID,
    name: "Vitor",
    weeklyMinutes: 150,
    dailyMinutes: 30,
    activeTrackId: ACTIVE_TRACK_ID,
    createdAt: now,
  }).onConflictDoNothing();
}

export async function getActiveTrackId(db: ReturnType<typeof getDb>) {
  const [user] = await db.select({ activeTrackId: users.activeTrackId }).from(users).where(eq(users.id, LOCAL_USER_ID)).limit(1);
  const selected = user?.activeTrackId ? getStudyTrack(user.activeTrackId) : null;
  return selected?.contentStatus === "complete" ? selected.id : ACTIVE_TRACK_ID;
}
