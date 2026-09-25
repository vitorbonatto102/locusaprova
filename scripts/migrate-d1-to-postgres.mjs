import { randomUUID } from "node:crypto";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backup, DatabaseSync } from "node:sqlite";
import nextEnv from "@next/env";
import postgres from "postgres";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(projectRoot);
const backupDirectory = path.join(projectRoot, ".migration-backups");
const localD1Directory = path.join(projectRoot, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const ignoredTables = new Set(["metadata", "__drizzle_migrations", "d1_migrations"]);

function identifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(value)) throw new Error(`Invalid SQL identifier: ${value}`);
  return `"${value}"`;
}

function sqliteTables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all().map((row) => row.name)
    .filter((name) => !name.startsWith("_cf_") && !ignoredTables.has(name));
}

function sourceColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${identifier(table)})`).all().map((row) => row.name);
}

function orderedTables(db, tables) {
  const remaining = new Set(tables);
  const ordered = [];
  while (remaining.size) {
    const ready = [...remaining].filter((table) => db.prepare(`PRAGMA foreign_key_list(${identifier(table)})`)
      .all().every((foreignKey) => !remaining.has(foreignKey.table) || foreignKey.table === table));
    if (!ready.length) throw new Error(`Circular foreign keys between: ${[...remaining].join(", ")}`);
    for (const table of ready) {
      remaining.delete(table);
      ordered.push(table);
    }
  }
  return ordered;
}

function convert(value, dataType) {
  if (value === null || value === undefined) return null;
  if (dataType === "boolean") return Boolean(value);
  if (dataType.startsWith("timestamp")) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid SQLite timestamp: ${value}`);
    return date;
  }
  return value;
}

async function findLocalD1() {
  const entries = await readdir(localD1Directory, { withFileTypes: true });
  const databases = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite") && entry.name !== "metadata.sqlite");
  if (databases.length !== 1) throw new Error(`Expected one local D1 database in ${localD1Directory}; found ${databases.length}. Pass --source PATH explicitly.`);
  return path.join(localD1Directory, databases[0].name);
}

function parseArguments(args) {
  let source;
  let backupOnly = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--source") source = args[++index];
    else if (args[index] === "--backup-only") backupOnly = true;
    else throw new Error(`Unknown argument: ${args[index]}`);
  }
  if (source === undefined && args.includes("--source")) throw new Error("--source requires a SQLite file path.");
  return { source, backupOnly };
}

async function main() {
  const { source, backupOnly } = parseArguments(process.argv.slice(2));
  const sourcePath = path.resolve(source ?? await findLocalD1());
  await mkdir(backupDirectory, { recursive: true });
  const snapshotPath = path.join(backupDirectory, `d1-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.sqlite`);
  const liveDb = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(liveDb, snapshotPath);
  } finally {
    liveDb.close();
  }

  const snapshot = new DatabaseSync(snapshotPath, { readOnly: true });
  try {
    const foreignKeyViolations = snapshot.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeyViolations.length) throw new Error(`The D1 snapshot has ${foreignKeyViolations.length} foreign-key violations. Import stopped; snapshot is preserved.`);
    const tables = orderedTables(snapshot, sqliteTables(snapshot));
    const counts = new Map(tables.map((table) => [table, snapshot.prepare(`SELECT count(*) AS count FROM ${identifier(table)}`).get().count]));
    console.log(`D1 snapshot saved outside Git: ${snapshotPath}`);
    console.log(`Source: ${tables.length} tables, ${[...counts.values()].reduce((sum, count) => sum + count, 0)} rows.`);
    if (backupOnly) return;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Set DATABASE_URL to the destination Postgres database. The D1 snapshot above remains available.");
    const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: /(?:localhost|127\.0\.0\.1)/.test(databaseUrl) ? false : "require" });
    try {
      await sql.begin(async (tx) => {
        const destination = await tx`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY ordinal_position`;
        const targetColumns = new Map();
        for (const column of destination) {
          if (!targetColumns.has(column.table_name)) targetColumns.set(column.table_name, new Map());
          targetColumns.get(column.table_name).set(column.column_name, column);
        }
        for (const table of tables) {
          const target = targetColumns.get(table);
          if (!target) throw new Error(`Postgres table ${table} is missing. Run npm run db:migrate first.`);
          const columns = sourceColumns(snapshot, table);
          for (const column of columns) if (!target.has(column)) throw new Error(`Postgres column ${table}.${column} is missing.`);
          for (const [name, definition] of target) {
            if (!columns.includes(name) && definition.is_nullable === "NO" && definition.column_default === null) {
              throw new Error(`Postgres requires ${table}.${name}, but it is absent from D1.`);
            }
          }
          const [{ count }] = await tx.unsafe(`SELECT count(*)::integer AS count FROM ${identifier(table)}`);
          if (count !== 0) throw new Error(`Destination table ${table} already has ${count} rows. Import stopped without modifying it.`);
        }

        for (const table of tables) {
          const columns = sourceColumns(snapshot, table);
          const target = targetColumns.get(table);
          const rows = snapshot.prepare(`SELECT * FROM ${identifier(table)}`).all();
          const batchSize = Math.max(1, Math.min(100, Math.floor(60000 / columns.length)));
          for (let start = 0; start < rows.length; start += batchSize) {
            const batch = rows.slice(start, start + batchSize);
            const values = batch.flatMap((row) => columns.map((column) => convert(row[column], target.get(column).data_type)));
            const placeholders = batch.map((_, rowIndex) => `(${columns.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(", ")})`).join(", ");
            await tx.unsafe(`INSERT INTO ${identifier(table)} (${columns.map(identifier).join(", ")}) VALUES ${placeholders}`, values);
          }
          const [{ count }] = await tx.unsafe(`SELECT count(*)::integer AS count FROM ${identifier(table)}`);
          if (count !== counts.get(table)) throw new Error(`Verification failed for ${table}: D1 has ${counts.get(table)} rows, Postgres has ${count}. Transaction rolled back.`);
          console.log(`${table}: ${count} rows verified`);
        }
      });
      console.log("Transfer complete. Original D1 and the SQLite snapshot remain unchanged.");
    } finally {
      await sql.end();
    }
  } finally {
    snapshot.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
