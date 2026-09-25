import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function routes(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

test("todas as APIs de progresso exigem usuário autenticado", () => {
  const apiRoutes = routes(path.join(root, "app", "api"));
  assert.ok(apiRoutes.length >= 10);
  for (const route of apiRoutes) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /getAuthenticatedUser\(\)/, route);
    assert.match(source, /if \(!\w+\) return unauthorized\(\)/, route);
    assert.doesNotMatch(source, /LOCAL_USER_ID|local-learner/, route);
  }
});

test("migração inicial cria apenas o schema isolado do Locus", () => {
  const migration = readFileSync(path.join(root, "drizzle-postgres", "0000_closed_stingray.sql"), "utf8");
  assert.match(migration, /^CREATE SCHEMA IF NOT EXISTS "locus";/);
  assert.equal((migration.match(/CREATE TABLE "locus"\./g) ?? []).length, 34);
  assert.doesNotMatch(migration, /(?:DROP TABLE|CREATE TABLE "public"\.)/);
});
