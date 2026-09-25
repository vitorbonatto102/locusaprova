import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const projectRef = "xbqwmydckectglcnmoya";
if (!databaseUrl) throw new Error("DATABASE_URL está vazia.");
let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  const hasHostSeparator = databaseUrl.includes("@");
  throw new Error(hasHostSeparator
    ? "DATABASE_URL inválida. Confira se a senha contém caracteres especiais que precisam ser codificados. Nenhuma alteração foi feita."
    : "DATABASE_URL incompleta: falta a parte depois da senha, incluindo @, servidor e banco. Copie a URI inteira no painel. Nenhuma alteração foi feita.");
}
if (!["postgresql:", "postgres:"].includes(parsed.protocol)) throw new Error("DATABASE_URL não é uma URL Postgres.");
if (!`${parsed.hostname} ${decodeURIComponent(parsed.username)}`.includes(projectRef)) throw new Error("A conexão não parece pertencer ao projeto Supabase esperado. Nenhuma alteração foi feita.");
if (parsed.password === "[YOUR-PASSWORD]" || !parsed.password) throw new Error("A senha do banco ainda não foi colocada na URL.");

const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 8, ssl: "require" });
try {
  const [database] = await sql`SELECT current_database() AS name`;
  const [schemas] = await sql`SELECT count(*)::integer AS count FROM information_schema.schemata WHERE schema_name = 'locus'`;
  const [tables] = await sql`SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema = 'locus'`;
  console.log(`Conexão OK. Banco: ${database.name}. Schema Locus: ${schemas.count ? "existe" : "não existe"}. Tabelas Locus: ${tables.count}.`);
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "sem código";
  console.error(`Não foi possível conectar ao banco (${code}). Confira a URL e a senha no arquivo local; nenhum dado foi alterado.`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
