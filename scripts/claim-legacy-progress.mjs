import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const userId = process.env.LEGACY_OWNER_USER_ID;
const expectedEmail = process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL;
const apply = process.argv.includes("--apply");
const legacyId = "local-learner";

if (!databaseUrl || !userId || !expectedEmail) throw new Error("Configure DATABASE_URL, LEGACY_OWNER_USER_ID e LEGACY_OWNER_EMAIL em .env.local.");
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new Error("LEGACY_OWNER_USER_ID não é um UUID válido.");

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: /(?:localhost|127\.0\.0\.1)/.test(databaseUrl) ? false : "require" });

try {
  const [owner] = await sql`SELECT id, email FROM auth.users WHERE id = ${userId}::uuid`;
  if (!owner || owner.email?.toLowerCase() !== expectedEmail) throw new Error("O UUID e o e-mail não correspondem à mesma conta no Supabase Auth.");
  const [legacy] = await sql`SELECT * FROM locus.users WHERE id = ${legacyId}`;
  if (!legacy) throw new Error("O progresso local-learner não foi importado; execute db:transfer primeiro.");
  const [destination] = await sql`SELECT * FROM locus.users WHERE id = ${userId}`;
  const tables = await sql`SELECT table_name FROM information_schema.columns WHERE table_schema = 'locus' AND column_name = 'user_id' ORDER BY table_name`;
  const counts = [];
  for (const { table_name } of tables) {
    if (!/^[a-z_][a-z_0-9]*$/.test(table_name)) throw new Error(`Nome de tabela inesperado no schema locus: ${table_name}`);
    const [{ count: sourceCount }] = await sql.unsafe(`SELECT count(*)::integer AS count FROM "locus"."${table_name}" WHERE user_id = $1`, [legacyId]);
    const [{ count: destinationCount }] = await sql.unsafe(`SELECT count(*)::integer AS count FROM "locus"."${table_name}" WHERE user_id = $1`, [userId]);
    if (destinationCount) throw new Error(`A conta de destino já contém ${destinationCount} registros em ${table_name}; não mescle dados automaticamente.`);
    counts.push({ table: table_name, count: sourceCount });
  }
  if (destination?.onboarding_completed_at) throw new Error("A conta de destino já completou o onboarding; não substitua o perfil automaticamente.");
  console.log(`Conta verificada: ${owner.email}. ${counts.reduce((total, item) => total + item.count, 0)} registros vinculados em ${counts.length} tabelas.`);
  if (!apply) {
    console.log("Prévia apenas. Execute novamente com --apply para transferir o progresso.");
  } else {
    await sql.begin(async (tx) => {
      const [currentLegacy] = await tx`SELECT * FROM locus.users WHERE id = ${legacyId} FOR UPDATE`;
      if (!currentLegacy) throw new Error("Usuário legado desapareceu durante a operação.");
      const [currentDestination] = await tx`SELECT * FROM locus.users WHERE id = ${userId} FOR UPDATE`;
      if (currentDestination?.onboarding_completed_at) throw new Error("Conta de destino já possui perfil de estudo.");
      for (const { table, count } of counts) {
        const [{ count: currentCount }] = await tx.unsafe(`SELECT count(*)::integer AS count FROM "locus"."${table}" WHERE user_id = $1`, [legacyId]);
        const [{ count: targetCount }] = await tx.unsafe(`SELECT count(*)::integer AS count FROM "locus"."${table}" WHERE user_id = $1`, [userId]);
        if (currentCount !== count || targetCount !== 0) throw new Error(`Os dados de ${table} mudaram após a prévia. Operação cancelada.`);
      }
      if (currentDestination) {
        await tx`UPDATE locus.users SET name = ${currentLegacy.name}, goal_date = ${currentLegacy.goal_date}, weekly_minutes = ${currentLegacy.weekly_minutes}, daily_minutes = ${currentLegacy.daily_minutes}, active_track_id = ${currentLegacy.active_track_id}, onboarding_completed_at = ${currentLegacy.onboarding_completed_at} WHERE id = ${userId}`;
      } else {
        await tx`INSERT INTO locus.users (id, name, goal_date, weekly_minutes, daily_minutes, active_track_id, onboarding_completed_at, created_at)
          VALUES (${userId}, ${currentLegacy.name}, ${currentLegacy.goal_date}, ${currentLegacy.weekly_minutes}, ${currentLegacy.daily_minutes}, ${currentLegacy.active_track_id}, ${currentLegacy.onboarding_completed_at}, ${currentLegacy.created_at})`;
      }
      for (const { table } of counts) {
        await tx.unsafe(`UPDATE "locus"."${table}" SET user_id = $1 WHERE user_id = $2`, [userId, legacyId]);
      }
      await tx`DELETE FROM locus.users WHERE id = ${legacyId}`;
    });
    console.log("Progresso transferido. O backup D1 permanece intacto.");
  }
} finally {
  await sql.end();
}
