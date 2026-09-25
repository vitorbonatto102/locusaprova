import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildDailyPlan, cleanExamText, questionToTrainingItems, rubricForUnit } from "../lib/corpus.mjs";
import { evaluateRubric, priorityScore } from "../lib/learning.mjs";

const units = JSON.parse(fs.readFileSync(new URL("../data/exam-units.json", import.meta.url)));
const confusionPairs = JSON.parse(fs.readFileSync(new URL("../data/confusion-pairs.json", import.meta.url)));
const adaptiveDrills = JSON.parse(fs.readFileSync(new URL("../data/oab-penal/adaptive-drills.json", import.meta.url)));

test("baixo domínio pesa mais do que frequência histórica isolada", () => {
  const weak = priorityScore({ frequency: 0, mastery: 0.1 });
  const frequentButMastered = priorityScore({ frequency: 1, mastery: 0.9 });
  assert.ok(weak > frequentButMastered);
});

test("agenda diária respeita orçamento e inclui discriminação de conceitos", () => {
  const plan = buildDailyPlan({ adaptiveDrills, confusionPairs, minutes: 30, date: new Date("2026-09-19T12:00:00Z") });
  assert.ok(plan.estimatedMinutes <= 30);
  assert.ok(plan.estimatedMinutes >= 26);
  assert.ok(plan.activities.length >= 6);
  assert.ok(plan.activities.some((item) => item.kind === "not_confuse"));
  assert.ok(plan.activities.some((item) => item.id.startsWith("adaptive-")));
  assert.ok(plan.activities.every((item) => ["autoral-oab-penal", "sintetico-transparente"].includes(item.examId)));
  assert.ok(plan.activities.every((item) => !item.source.url));
  assert.doesNotMatch(plan.activities.map((item) => `${item.examLabel} ${item.prompt}`).join(" "), /\bOAB\s*\d+|Exame de Ordem|FGV/i);
});

test("agenda de amanhã rotaciona o conteúdo sem apagar prioridades", () => {
  const today = buildDailyPlan({ adaptiveDrills, confusionPairs, minutes: 30, date: new Date("2026-09-19T12:00:00Z") });
  const tomorrow = buildDailyPlan({ adaptiveDrills, confusionPairs, minutes: 30, date: new Date("2026-09-20T12:00:00Z") });
  assert.notDeepEqual(today.activities.map((item) => item.id), tomorrow.activities.map((item) => item.id));
});

test("novos microcasos de teses têm contexto, resposta e rubrica completos", () => {
  const expanded = adaptiveDrills.filter((item) => item.estimated_minutes === 5);
  assert.ok(expanded.length >= 24);
  assert.equal(new Set(adaptiveDrills.map((item) => item.id)).size, adaptiveDrills.length);
  for (const item of expanded) {
    assert.ok(["thesis_hunt", "complete_foundation"].includes(item.kind));
    assert.ok(item.prompt.split(/\s+/).length >= 45, item.id);
    assert.ok(item.answer.split(/\s+/).length >= 30, item.id);
    assert.ok(Math.abs(item.rubric.reduce((sum, criterion) => sum + criterion.points, 0) - 1) < 0.001, item.id);
    assert.ok(item.rubric.every((criterion) => criterion.required_terms.length > 0), item.id);
    assert.equal(evaluateRubric(item.answer, item.rubric).ratio, 1, item.id);
  }
});

test("plano evita repetir item acabado recentemente quando há alternativa", () => {
  const sample = adaptiveDrills.filter((item) => item.estimated_minutes === 5).slice(0, 2);
  const date = new Date("2026-09-22T12:00:00Z");
  const baseline = buildDailyPlan({ adaptiveDrills: sample, minutes: 5, date });
  const recentlyDone = baseline.activities[0].id;
  const next = buildDailyPlan({
    adaptiveDrills: sample,
    recentAttempts: [{ exerciseId: recentlyDone, createdAt: new Date("2026-09-22T10:00:00Z") }],
    minutes: 5,
    date,
  });
  assert.notEqual(next.activities[0].id, recentlyDone);
});

test("rubrica da peça soma cinco pontos e explicita pontos deixados", () => {
  const piece = units.find((unit) => unit.id === "oab-46-penal-piece");
  const rubric = rubricForUnit(piece);
  const result = evaluateRubric("", rubric);
  assert.equal(result.maxScore, 5);
  assert.equal(result.score, 0);
  assert.equal(result.maxScore - result.score, 5);
});

test("padrão sem fração usa pesos pedagógicos identificados", () => {
  const unit = units.find((item) => item.rubric_items.length === 0);
  const rubric = rubricForUnit(unit);
  assert.ok(rubric.length > 0);
  assert.ok(rubric.every((item) => item.scoring === "transparent_pedagogical_weight"));
});

test("enunciado de questão mostra a pergunta real em vez do número interno do espelho", () => {
  const unit = units.find((item) => item.kind === "question" && item.rubric_items.some((rubric) => rubric.official_label === "A"));
  const activity = questionToTrainingItems(unit).find((item) => item.id.endsWith("item-A"));
  assert.ok(activity.question.length > 20);
  assert.doesNotMatch(activity.question, /critério|espelho/i);
});

test("limpeza de OCR remove quebras e espaços antes da pontuação", () => {
  assert.equal(cleanExamText("Art . 17 do CP ,\ncom fundamento."), "Art. 17 do CP, com fundamento.");
});
