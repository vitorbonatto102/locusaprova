import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  // Until authentication replaces LOCAL_USER_ID in every route, never expose the shared learner on Vercel.
  if (process.env.VERCEL_ENV) throw new Error("User authentication is required before enabling database access on Vercel.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to access the Postgres database.");
  client ??= postgres(databaseUrl, { max: 1, prepare: false, ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require" });
  return drizzle(client, { schema });
}
