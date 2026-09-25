import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregateKnowledgeTree, buildAdaptivePlan, buildDiagnosticQuestions, buildReviewCards, cebraspeScore, countKnowledgeTree, overlapExamTargets, scoreObjective, updateKnowledgeMastery } from "../lib/adaptive-engine.mjs";

const questions = JSON.parse(await readFile(new URL("../data/police/questions.json", import.meta.url), "utf8"));
const notice = JSON.parse(await readFile(new URL("../data/police/pf-agent-2025.json", import.meta.url), "utf8"));
const targets = JSON.parse(await readFile(new URL("../data/police/exam-targets.json", import.meta.url), "utf8"));
const prfNotice = JSON.parse(await readFile(new URL("../data/police/prf-2021.json", import.meta.url), "utf8"));
const prfQuestions = JSON.parse(await readFile(new URL("../data/police/prf-questions.json", import.meta.url), "utf8"));

test("pontuação Cebraspe separa acerto, erro e branco", () => {
  assert.equal(cebraspeScore(true, true), 1);
  assert.equal(cebraspeScore(false, true), -1);
  assert.equal(cebraspeScore(null, true), 0);
});

test("estratégia de pontuação pertence ao edital", () => {
  assert.equal(scoreObjective({ strategy: "cebraspe_true_false", answer: false, correctAnswer: true }), -1);
  assert.equal(scoreObjective({ strategy: "standard_multiple_choice", answer: false, correctAnswer: true }), 0);
});

test("uma única resposta não produz domínio irreal", () => {
  const next = updateKnowledgeMastery({ isCorrect: true, confidence: 5, difficulty: 2, now: new Date("2026-01-01T00:00:00Z") });
  assert.ok(next.mastery > 0);
  assert.ok(next.mastery < 0.5);
  assert.equal(next.evidenceCount, 1);
});

test("erro de alta confiança volta antes", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const certain = updateKnowledgeMastery({ isCorrect: false, confidence: 5, now });
  const unsure = updateKnowledgeMastery({ isCorrect: false, confidence: 1, now });
  assert.ok(certain.nextReviewAt < unsure.nextReviewAt);
});

test("diagnóstico distribui itens entre as cinco matérias", () => {
  const diagnostic = buildDiagnosticQuestions(questions, 20);
  assert.equal(diagnostic.length, 20);
  assert.equal(new Set(diagnostic.map((question) => question.subjectId)).size, 5);
  const counts = Object.values(Object.groupBy(diagnostic, (question) => question.subjectId)).map((items) => items.length);
  assert.deepEqual(new Set(counts), new Set([4]));
});

test("revisão vencida ganha prioridade no plano", () => {
  const now = new Date("2026-01-03T00:00:00Z");
  const dueNode = questions[10].topicIds[0];
  const plan = buildAdaptivePlan({ questions, mastery: [], attempts: [], minutes: 30, now, reviews: [{ knowledgeNodeId: dueNode, scheduledFor: new Date("2026-01-02T00:00:00Z"), completedAt: null }] });
  assert.ok(plan.slice(0, 5).some((entry) => entry.question.topicIds.includes(dueNode)));
});

test("mapa não inventa percentual para tópico sem evidência", () => {
  const [subject] = aggregateKnowledgeTree(notice.knowledgeTree, []);
  assert.equal(subject.mastery, null);
  assert.equal(subject.topics[0].mastery, null);
});

test("árvore e sobreposição de editais preservam conhecimento comum", () => {
  assert.deepEqual(countKnowledgeTree(notice.knowledgeTree), { subjects: 5, topics: 35, subtopics: 83 });
  const overlap = overlapExamTargets(targets.targets[0], targets.targets.find((target) => target.id === "pc-rs-inspector-2025"));
  assert.ok(overlap.shared.length >= 10);
  assert.ok(overlap.overlapRatio > 0.6);
});

test("PRF 2021 tem 14 disciplinas, conteúdo não jurídico funcional e domínio compartilhado", () => {
  assert.deepEqual(countKnowledgeTree(prfNotice.knowledgeTree), { subjects: 14, topics: 86, subtopics: 201 });
  assert.equal(prfQuestions.length, 24);
  for (const topicId of ["traffic-general-rules", "traffic-snt", "physics-kinematics", "physics-newton", "geo-transport-network", "geo-population-urbanization"]) {
    assert.ok(prfQuestions.filter((question) => question.topicIds.includes(topicId)).length >= 3);
  }
  assert.ok(prfQuestions.every((question) => question.isOfficial === false && question.source.label === "Autoral · conteúdo do edital PRF"));
  const pf = targets.targets.find((target) => target.id === "pf-agent-2025");
  const prf = targets.targets.find((target) => target.id === "prf-2021");
  const overlap = overlapExamTargets(pf, prf);
  assert.equal(overlap.shared.length, 29);
  const sharedSubject = aggregateKnowledgeTree(prfNotice.knowledgeTree, [{ knowledgeNodeId: "const-public-security", mastery: 0.8, evidenceCount: 5 }]).find((subject) => subject.id === "subject-constitutional");
  assert.equal(sharedSubject.topics.find((topic) => topic.id === "const-public-security")?.mastery, 0.8);
  const cards = buildReviewCards({ tree: prfNotice.knowledgeTree, questions: prfQuestions, mastery: [{ knowledgeNodeId: "traffic-general-rules", mastery: 0.8, evidenceCount: 5 }], reviews: [], errors: [] });
  assert.equal(cards.find((card) => card.topicId === "traffic-general-rules")?.state, "forte");
});
