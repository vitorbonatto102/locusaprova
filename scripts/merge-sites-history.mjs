import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const source = "https://locus-penal-oab.vitugas.chatgpt.site";
const args = process.argv.slice(2);
const emailIndex = args.indexOf("--email");
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : null;
const apply = args.includes("--apply");
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Informe a conta de destino com --email endereco@exemplo.com.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

async function getJson(endpoint) {
  const response = await fetch(`${source}/api/${endpoint}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`O site antigo retornou ${response.status} em /api/${endpoint}.`);
  return response.json();
}

function date(value, label) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Data inválida em ${label}.`);
  return parsed;
}

const [progress, history] = await Promise.all([getJson("progress"), getJson("attempts")]);
if (!Array.isArray(progress.errors) || !Array.isArray(progress.mastery) || !Array.isArray(history.attempts)) {
  throw new Error("O site antigo não retornou o histórico esperado.");
}
if (!progress.errors.some((row) => row.excerpt?.includes("Na desistência voluntária, podendo continuar"))) {
  throw new Error("O histórico recebido não corresponde ao caderno de erros informado.");
}
const remoteAttempts = history.attempts;
const remoteErrors = progress.errors;
const remoteMastery = progress.mastery;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });

try {
  const [owner] = await sql`SELECT id FROM auth.users WHERE lower(email) = ${email}`;
  if (!owner) throw new Error("A conta de destino não existe no Supabase Auth.");
  const userId = owner.id;
  const [user] = await sql`SELECT id FROM locus.users WHERE id = ${userId}::text`;
  if (!user) throw new Error("A conta de destino ainda não tem perfil no Locus.");

  const [localAttempts, localErrors, localMastery] = await Promise.all([
    sql`SELECT * FROM locus.attempts WHERE user_id = ${userId}::text`,
    sql`SELECT * FROM locus.error_log WHERE user_id = ${userId}::text`,
    sql`SELECT * FROM locus.mastery WHERE user_id = ${userId}::text`,
  ]);
  const existingAttemptIds = new Set(localAttempts.map((row) => row.id));
  const existingErrorIds = new Set(localErrors.map((row) => row.id));
  const existingMastery = new Map(localMastery.map((row) => [`${row.track_id}:${row.skill_id}`, row]));
  const newAttempts = remoteAttempts.filter((row) => !existingAttemptIds.has(row.id));
  const newErrors = remoteErrors.filter((row) => !existingErrorIds.has(row.id));
  const newerMastery = remoteMastery.filter((row) => {
    const prior = existingMastery.get(`${row.trackId}:${row.skillId}`);
    return !prior || date(row.lastReviewedAt, "mastery.lastReviewedAt") > prior.last_reviewed_at;
  });

  console.log(`Conta de destino: ${email}.`);
  console.log(`Site antigo: ${remoteAttempts.length} tentativas recentes, ${remoteErrors.length} erros visíveis e ${remoteMastery.length} habilidades.`);
  console.log(`Para somar: ${newAttempts.length} tentativas, ${newErrors.length} erros e ${newerMastery.length} habilidades novas ou mais atuais.`);
  console.log("A API antiga limita a resposta a 30 tentativas e 20 erros; esta operação não promete recuperar registros anteriores a esses limites.");
  if (!apply) {
    console.log("Prévia apenas. Execute com --apply para gravar.");
  } else {
    const backupDirectory = path.join(process.cwd(), ".migration-backups");
    await mkdir(backupDirectory, { recursive: true });
    const backupPath = path.join(backupDirectory, `sites-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    await writeFile(backupPath, JSON.stringify({ source, email, remoteAttempts, remoteErrors, remoteMastery, localAttempts, localErrors, localMastery }, null, 2), { flag: "wx" });
    const now = new Date();
    const latestReasonableReview = new Date(now.getTime() + 30 * 86400000);
    let repairedReviews = 0;
    await sql.begin(async (tx) => {
      for (const row of newAttempts) {
        await tx`INSERT INTO locus.attempts (id, user_id, track_id, exercise_id, thesis_id, kind, answer, score, max_score, confidence, duration_seconds, feedback_json, created_at)
          VALUES (${row.id}, ${userId}, ${row.trackId}, ${row.exerciseId}, ${row.thesisId}, ${row.kind}, ${row.answer}, ${row.score}, ${row.maxScore}, ${row.confidence}, ${row.durationSeconds}, ${row.feedbackJson}, ${date(row.createdAt, "attempt.createdAt")})
          ON CONFLICT (id) DO NOTHING`;
      }
      for (const row of newErrors) {
        const nextReview = date(row.nextReviewAt, "error.nextReviewAt");
        await tx`INSERT INTO locus.error_log (id, user_id, track_id, exercise_id, thesis_id, category, confidence, excerpt, resolved, next_review_at, created_at)
          VALUES (${row.id}, ${userId}, ${row.trackId}, ${row.exerciseId}, ${row.thesisId}, ${row.category}, ${row.confidence}, ${row.excerpt}, ${row.resolved}, ${nextReview > latestReasonableReview ? now : nextReview}, ${date(row.createdAt, "error.createdAt")})
          ON CONFLICT (id) DO NOTHING`;
      }
      for (const row of newerMastery) {
        const prior = existingMastery.get(`${row.trackId}:${row.skillId}`);
        const nextReview = date(row.nextReviewAt, "mastery.nextReviewAt");
        if (prior) {
          await tx`UPDATE locus.mastery SET mastery = ${row.mastery}, stability_days = ${row.stabilityDays}, state = ${row.state}, next_review_at = ${nextReview > latestReasonableReview ? latestReasonableReview : nextReview}, last_reviewed_at = ${date(row.lastReviewedAt, "mastery.lastReviewedAt")}
            WHERE id = ${prior.id} AND user_id = ${userId}`;
        } else {
          await tx`INSERT INTO locus.mastery (id, user_id, track_id, skill_id, mastery, stability_days, state, next_review_at, last_reviewed_at)
            VALUES (${randomUUID()}, ${userId}, ${row.trackId}, ${row.skillId}, ${row.mastery}, ${row.stabilityDays}, ${row.state}, ${nextReview > latestReasonableReview ? latestReasonableReview : nextReview}, ${date(row.lastReviewedAt, "mastery.lastReviewedAt")})`;
        }
      }
      const repaired = await tx`UPDATE locus.error_log SET next_review_at = ${now}
        WHERE user_id = ${userId} AND resolved = false AND next_review_at > ${latestReasonableReview}
        RETURNING id`;
      repairedReviews = repaired.length;
    });
    console.log(`Histórico somado. ${repairedReviews} revisões com datas excessivamente distantes foram trazidas para hoje.`);
    console.log(`Cópia de segurança local: ${backupPath}`);
  }
} finally {
  await sql.end();
}
