import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/study-tracks.json", import.meta.url), "utf8"));

test("catálogo tem IDs únicos e objetivo ativo realmente disponível", () => {
  const ids = catalog.tracks.map((track) => track.id);
  assert.equal(new Set(ids).size, ids.length);
  const active = catalog.tracks.find((track) => track.id === catalog.activeTrackId);
  assert.ok(active);
  assert.equal(active.contentStatus, "complete");
});

test("estrutura cobre OAB primeira e segunda fases sem inventar conteúdo", () => {
  const first = catalog.tracks.find((track) => track.id === "oab-first-phase");
  assert.equal(first.contentStatus, "planned");
  assert.ok(first.subjects.length >= 20);
  assert.deepEqual(first.capabilities, ["daily-adaptive-training", "subject-drills", "objective-questions", "error-notebook", "statute-reading", "frequency-radar", "spaced-review", "objective-simulations"]);
  const secondPhase = catalog.tracks.filter((track) => track.examFamilyId === "oab" && track.stageId === "second-phase");
  assert.equal(secondPhase.length, 7);
  assert.equal(secondPhase.filter((track) => track.contentStatus === "complete").length, 1);
});

test("cada carreira de concurso possui um percurso estrutural", () => {
  const family = catalog.families.find((item) => item.id === "public-exams");
  for (const path of family.pathways) {
    assert.ok(catalog.tracks.some((track) => track.examFamilyId === family.id && track.stageId === path.id));
  }
});

test("PF e PRF são as verticais policiais ativas e as demais não fingem conteúdo", () => {
  const police = catalog.tracks.filter((track) => track.examFamilyId === "public-exams" && track.stageId === "police");
  const available = police.filter((track) => track.contentStatus === "complete");
  assert.deepEqual(available.map((track) => track.id), ["public-exams-police-pf-agent-2025", "public-exams-police-prf"]);
  assert.ok(available[0].capabilities.includes("initial-diagnostic"));
  assert.ok(available[0].capabilities.includes("cebraspe-training"));
  assert.equal(available[1].subjects.length, 14);
  assert.match(available[1].contentNote, /último edital oficial disponível/i);
});
