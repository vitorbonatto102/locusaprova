import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ACTIVE_TRACK_ID, getStudyTrack } from "@/lib/study-track";

export async function ensureUser(db: ReturnType<typeof getDb>, user: { id: string; email: string | null }, now = new Date()) {
  await db.insert(users).values({
    id: user.id,
    name: user.email?.split("@")[0] || "Estudante",
    weeklyMinutes: 150,
    dailyMinutes: 30,
    activeTrackId: ACTIVE_TRACK_ID,
    createdAt: now,
  }).onConflictDoNothing();
}

export async function getActiveTrackId(db: ReturnType<typeof getDb>, userId: string) {
  const [user] = await db.select({ activeTrackId: users.activeTrackId }).from(users).where(eq(users.id, userId)).limit(1);
  const selected = user?.activeTrackId ? getStudyTrack(user.activeTrackId) : null;
  return selected?.contentStatus === "complete" ? selected.id : ACTIVE_TRACK_ID;
}
