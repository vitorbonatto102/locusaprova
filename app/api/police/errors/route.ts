import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { learningErrors } from "@/db/schema";
import { ensurePoliceCatalog, getActivePoliceProgram } from "@/lib/police-context";
import { getPoliceQuestion } from "@/lib/police-data";
import { ensureUser } from "@/lib/user-context";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const db = getDb();
    await ensureUser(db, user);
    await ensurePoliceCatalog(db);
    const program = await getActivePoliceProgram(db, USER_ID);
    const questionIds = new Set(program.questions.map((question) => question.id));
    const rows = await db.select().from(learningErrors).where(and(eq(learningErrors.userId, USER_ID), isNull(learningErrors.resolvedAt))).orderBy(desc(learningErrors.createdAt));
    return Response.json({ errors: rows.filter((row) => questionIds.has(row.questionId)).map((row) => ({ ...row, question: getPoliceQuestion(row.questionId) })) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erros indisponíveis" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();
  const USER_ID = user.id;
  try {
    const payload = await request.json() as { id?: string; category?: string; resolved?: boolean };
    if (!payload.id) return Response.json({ error: "Erro inválido" }, { status: 400 });
    const allowed = new Set(["knowledge-gap", "reasoning-slip", "misconception", "reading-error", "attention-slip"]);
    const set: { category?: string; resolvedAt?: Date | null; updatedAt: Date } = { updatedAt: new Date() };
    if (payload.category && allowed.has(payload.category)) set.category = payload.category;
    if (typeof payload.resolved === "boolean") set.resolvedAt = payload.resolved ? new Date() : null;
    const db = getDb();
    await db.update(learningErrors).set(set).where(and(eq(learningErrors.id, payload.id), eq(learningErrors.userId, USER_ID)));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar" }, { status: 500 });
  }
}
