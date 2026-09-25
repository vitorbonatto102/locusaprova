import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  // Never reuse a database connection for a different learner identity: routes scope every query by user id.
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to access the Postgres database.");
  client ??= postgres(databaseUrl, { max: 1, prepare: false, ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require" });
  return drizzle(client, { schema });
}
