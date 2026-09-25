import fs from "node:fs";

const read = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const exams = read("../data/fgv-penal-exams.json");
const units = read("../data/exam-units.json");
const taxonomy = read("../data/taxonomy.json");
const thesisUnits = read("../data/thesis-units.json");
const graph = read("../data/knowledge-graph.json");
const failures = [];
const warnings = [];
const skillIds = new Set(taxonomy.skills.map((skill) => skill.id));
const unitIds = new Set(units.map((unit) => unit.id));

if (exams.length !== 20) failures.push(`exams.count: esperado 20, recebido ${exams.length}`);
if (units.length !== 100) failures.push(`units.count: esperado 100, recebido ${units.length}`);
if (unitIds.size !== units.length) failures.push("units.ids: há IDs duplicados");
if (units.filter((unit) => unit.kind === "piece").length !== 20) failures.push("units.pieces: esperado 20");
if (units.filter((unit) => unit.kind === "question").length !== 80) failures.push("units.questions: esperado 80");

for (const exam of exams) {
  const related = units.filter((unit) => unit.exam_id === exam.exam_id);
  const questions = related.filter((unit) => unit.kind === "question");
  if (related.length !== 5) failures.push(`${exam.exam_id}: esperado 5 unidades, recebido ${related.length}`);
  if (related.filter((unit) => unit.kind === "piece").length !== 1) failures.push(`${exam.exam_id}: peça ausente ou duplicada`);
  if (questions.length !== 4 || questions.map((unit) => unit.question_number).sort().join(",") !== "1,2,3,4") failures.push(`${exam.exam_id}: questões 1–4 incompletas`);
  if (!exam.source_url?.startsWith("https://oab.fgv.br/")) failures.push(`${exam.exam_id}: fonte não oficial`);
}

for (const unit of units) {
  const expected = unit.kind === "piece" ? 5 : 1.25;
  if (Math.abs(unit.official_total_score - expected) > 0.001) failures.push(`${unit.id}: total oficial ${unit.official_total_score}, esperado ${expected}`);
  if (unit.statement.length < 80) failures.push(`${unit.id}: enunciado ausente ou curto`);
  if (unit.official_commentary.length < 60) failures.push(`${unit.id}: gabarito comentado ausente ou curto`);
  if (!unit.source?.url?.startsWith("https://oab.fgv.br/") || !unit.source.page_start) failures.push(`${unit.id}: proveniência incompleta`);
  if (!unit.pedagogical_rubric?.length) failures.push(`${unit.id}: rubrica pedagógica vazia`);
  for (const skillId of unit.skill_ids ?? []) if (!skillIds.has(skillId)) failures.push(`${unit.id}: habilidade órfã ${skillId}`);
  for (const item of unit.rubric_items ?? []) {
    if (!item.official_text || item.official_score_max <= 0) failures.push(`${item.id}: critério oficial inválido`);
    for (const skillId of item.skill_ids ?? []) if (!skillIds.has(skillId)) failures.push(`${item.id}: habilidade órfã ${skillId}`);
  }
  if (unit.rubric_items.length) {
    const sum = unit.rubric_items.reduce((total, item) => total + item.official_score_max, 0);
    if (Math.abs(sum - expected) > 0.011) failures.push(`${unit.id}: soma ${sum.toFixed(2)} diverge de ${expected.toFixed(2)}`);
  } else {
    if (unit.review.status !== "machine_checked_no_fractional_table") failures.push(`${unit.id}: sem tabela fracionada e sem status explícito`);
    if (unit.pedagogical_rubric.some((item) => item.scoring !== "unscored_pedagogical_decomposition")) failures.push(`${unit.id}: componente sem fração recebeu pontuação inventada`);
    warnings.push(`${unit.id}: padrão oficial sem tabela fracionada; componentes permanecem sem nota`);
  }
}

if (thesisUnits.audit.generated_missing_units !== 57) failures.push("theses.generated: esperado 57");
if (thesisUnits.units.length !== 77) failures.push(`theses.total: esperado 77, recebido ${thesisUnits.units.length}`);
const graphThesisIds = new Set(graph.nodes.theses.map((item) => item.id));
for (const exam of exams) for (const thesisId of exam.theses) if (!graphThesisIds.has(thesisId)) failures.push(`${exam.exam_id}: tese órfã ${thesisId}`);

const officialRubricItems = units.reduce((sum, unit) => sum + unit.rubric_items.length, 0);
const machineChecked = units.filter((unit) => unit.review.status === "machine_checked").length;
const manualVerified = units.filter((unit) => unit.review.status === "manual_verified").length;
const noFraction = units.filter((unit) => unit.review.status === "machine_checked_no_fractional_table").length;
if (manualVerified !== 10) failures.push(`manual.sample: esperado 10, recebido ${manualVerified}`);
const generatedAt = new Date().toISOString();
const report = `# Relatório de QA jurídico e estrutural\n\nGerado em ${generatedAt}.\n\n## Resultado\n\n- Falhas bloqueantes: **${failures.length}**\n- Alertas de proveniência: **${warnings.length}**\n- Provas: **${exams.length}/20**\n- Peças: **${units.filter((unit) => unit.kind === "piece").length}/20**\n- Questões: **${units.filter((unit) => unit.kind === "question").length}/80**\n- Unidades: **${units.length}/100**\n- Critérios oficiais atomizados: **${officialRubricItems}**\n- Unidades com soma fracionada conferida automaticamente: **${machineChecked}**\n- Unidades verificadas visualmente contra o PDF: **${manualVerified}/10**\n- Unidades cujo padrão só informa total: **${noFraction}**\n- Teses aprofundadas existentes: **20**\n- Teses oficiais antes ausentes e agora geradas: **${thesisUnits.audit.generated_missing_units}/57**\n- Nós de tese normalizados: **${thesisUnits.units.length}**\n- Relações no grafo: **${graph.edges.length}**\n\n## Regra de pontuação\n\nQuando o padrão oficial traz a tabela fracionada, a soma deve coincidir com 5,00 ou 1,25. Quando não traz, o total oficial é preservado e a decomposição pedagógica fica explicitamente sem pontuação.\n\n## Falhas\n\n${failures.length ? failures.map((item) => `- ${item}`).join("\n") : "Nenhuma."}\n\n## Alertas\n\n${warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "Nenhum."}\n`;
fs.mkdirSync(new URL("../docs/qa/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../docs/qa/legal-data-report.md", import.meta.url), report);
fs.writeFileSync(new URL("../data/qa-report.json", import.meta.url), `${JSON.stringify({ generatedAt, failures, warnings, counts: { exams: exams.length, pieces: units.filter((unit) => unit.kind === "piece").length, questions: units.filter((unit) => unit.kind === "question").length, units: units.length, officialRubricItems, machineChecked, manualVerified, noFraction, generatedTheses: thesisUnits.audit.generated_missing_units, graphEdges: graph.edges.length } }, null, 2)}\n`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`OK: 20 exames, 20 peças, 80 questões, 100 unidades, ${officialRubricItems} critérios, 0 falhas.`);
