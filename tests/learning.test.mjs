import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRubric, interleave, normalizeLegalText, priorityScore, scheduleReview } from "../lib/learning.mjs";
import { evaluateSelfAssessment } from "../lib/simulation.mjs";
import { cleanOfficialText } from "../lib/corpus.mjs";

test("normaliza acentos sem destruir referências legais", () => {
  assert.equal(normalizeLegalText("Prescrição — Art. 109, V"), "prescricao art 109 v");
});

test("rubrica concede crédito parcial por critério", () => {
  const result = evaluateRubric("Reconhecer a tentativa", [
    { criterion: "tese", points: 0.5, required_terms: ["tentativa"] },
    { criterion: "base", points: 0.5, required_terms: ["14", "II"] },
  ]);
  assert.equal(result.score, 0.5);
  assert.equal(result.maxScore, 1);
});

test("resposta de referência sempre recebe nota integral, mesmo com formatação diferente", () => {
  const reference = "Deve-se reconhecer a prova ilícita e pedir o desentranhamento, nos termos do art. 157 do CPP.";
  const result = evaluateRubric(`Resposta: ${reference.toUpperCase()}`, [
    { criterion: "tese", points: 0.5, required_terms: ["prova ilícita"] },
    { criterion: "fundamento", points: 0.5, required_terms: ["157"] },
  ], reference);
  assert.equal(result.ratio, 1);
  assert.equal(result.usedReferenceAnswer, true);
});

test("aceita formulações jurídicas equivalentes sem exigir frase idêntica", () => {
  const result = evaluateRubric("A ilicitude da prova exige a exclusão da prova dos autos, conforme artigo 157 do CPP.", [
    { criterion: "tese", points: 0.5, required_terms: ["prova ilícita"] },
    { criterion: "consequência", points: 0.3, required_terms: ["desentranhamento"] },
    { criterion: "fundamento", points: 0.2, required_terms: ["art. 157"] },
  ]);
  assert.equal(result.ratio, 1);
});

test("autoavaliação do simulado concede apenas os critérios marcados", () => {
  const result = evaluateSelfAssessment([
    { criterion: "peça correta", points: 0.6 },
    { criterion: "fundamento", points: 0.4 },
  ], [1, 99]);
  assert.equal(result.score, 0.4);
  assert.equal(result.maxScore, 1);
  assert.equal(result.criteria[0].met, false);
  assert.equal(result.criteria[1].met, true);
});

test("limpeza do espelho remove cabeçalho de página sem cortar a continuação", () => {
  const raw = "Tese principal (0,40).\nXXXIII EXAME DE ORDEM UNIFICADO\nPROVA PRÁTICO-PROFISSIONAL Aplicada em 12/12/2021\nPadrão de Resposta Página 4 de 12\nFundamento no Art. 212 do CPP (0,10).";
  assert.equal(cleanOfficialText(raw), "Tese principal (0,40). Fundamento no Art. 212 do CPP (0,10)." );
});

test("erro de alta confiança retorna antes", () => {
  const low = scheduleReview({ ratio: 0.2, confidence: 5, now: new Date("2026-01-01T00:00:00Z") });
  const good = scheduleReview({ ratio: 0.9, confidence: 3, now: new Date("2026-01-01T00:00:00Z") });
  assert.equal(low.highConfidenceError, true);
  assert.ok(low.nextReviewAt < good.nextReviewAt);
});

test("prioridade aumenta com erro confiante e atraso", () => {
  assert.ok(priorityScore({ frequency: 4, mastery: 0.2, overdueDays: 4, confidenceError: true }) > priorityScore({ frequency: 4, mastery: 0.8 }));
});

test("interleaving evita repetição de categoria quando há alternativa", () => {
  const result = interleave([{ category: "a", id: 1 }, { category: "a", id: 2 }, { category: "b", id: 3 }]);
  assert.notEqual(result[0].category, result[1].category);
});
