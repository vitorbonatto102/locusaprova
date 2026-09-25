import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attempts, errorLog, mastery } from "@/db/schema";
import { getActiveTrackId } from "@/lib/user-context";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const db = getDb();
    const trackId = await getActiveTrackId(db, USER_ID);
    const [skills, errors, recent] = await Promise.all([
      db.select().from(mastery).where(and(eq(mastery.userId, USER_ID), eq(mastery.trackId, trackId))),
      db.select().from(errorLog).where(and(eq(errorLog.userId, USER_ID), eq(errorLog.trackId, trackId))).orderBy(desc(errorLog.createdAt)).limit(20),
      db.select().from(attempts).where(and(eq(attempts.userId, USER_ID), eq(attempts.trackId, trackId))).orderBy(desc(attempts.createdAt)).limit(12),
    ]);
    const average = skills.length ? skills.reduce((sum, row) => sum + row.mastery, 0) / skills.length : 0;
    return Response.json({ mastery: skills, errors, recent, average }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    const text = error instanceof Error ? error.message : "Erro inesperado";
    return Response.json({ error: text }, { status: 500, headers: { "cache-control": "no-store, max-age=0" } });
  }
}
