import fs from "node:fs";

const read = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const exams = read("../data/fgv-penal-exams.json");
const curated = read("../data/theses.json");
const units = read("../data/exam-units.json");
const taxonomy = read("../data/taxonomy.json");
const confusionPairs = read("../data/confusion-pairs.json");

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const title = (id) => id.split("-").map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
const stop = new Set(["da", "de", "do", "dos", "das", "sem", "com", "por", "para", "em"]);
const tokens = (id) => id.split("-").filter((word) => word.length > 2 && !stop.has(word));
const citations = (value) => [...new Set([...value.matchAll(/(?:Art\.\s*\d+[ºo]?(?:\s*,\s*(?:§\s*\d+[ºo]?|inciso\s+[IVXLCDM]+))?|S[úu]mula\s*\d+)/gi)].map((match) => match[0].replace(/\s+/g, " ")))];

const curatedIds = new Set(curated.map((item) => item.id));
const examThesisIds = [...new Set(exams.flatMap((exam) => exam.theses))];
const missingIds = examThesisIds.filter((id) => !curatedIds.has(id));
if (missingIds.length !== 57) throw new Error(`Esperadas 57 teses sem unidade aprofundada; encontradas ${missingIds.length}.`);

function bestEvidence(id) {
  const thesisTokens = tokens(id);
  const eligible = units.filter((unit) => unit.thesis_ids.includes(id));
  const candidates = eligible.flatMap((unit) => unit.rubric_items.map((rubric) => ({ unit, rubric, text: normalize(rubric.official_text) })));
  candidates.sort((a, b) => thesisTokens.filter((token) => b.text.includes(token)).length - thesisTokens.filter((token) => a.text.includes(token)).length || b.rubric.official_text.length - a.rubric.official_text.length);
  return candidates[0] ?? { unit: eligible[0], rubric: null, text: "" };
}

const generated = missingIds.map((id) => {
  const evidence = bestEvidence(id);
  const officialText = evidence.rubric?.official_text ?? evidence.unit?.official_commentary ?? "";
  const relatedExams = exams.filter((exam) => exam.theses.includes(id));
  return {
    id,
    name: title(id),
    classification: "machine_derived_from_official_standard",
    review_status: "machine_checked",
    concept: officialText.slice(0, 700),
    case_elements: relatedExams.map((exam) => exam.facts_summary).slice(0, 3),
    fgv_cues: tokens(id),
    legal_basis: citations(officialText),
    consequence: evidence.rubric?.official_text ?? "Conferir a consequência no padrão oficial vinculado.",
    related_requests: relatedExams.flatMap((exam) => exam.requests).filter((value, index, all) => all.indexOf(value) === index),
    exam_ids: relatedExams.map((exam) => exam.exam_id),
    skill_ids: evidence.rubric?.skill_ids ?? evidence.unit?.skill_ids ?? ["identify_thesis", "apply_rule_to_facts"],
    confusable_with: [],
    short_example: evidence.unit?.statement?.slice(0, 500) ?? relatedExams[0]?.facts_summary ?? "",
    source_unit_id: evidence.unit?.id ?? null,
    source_rubric_item_id: evidence.rubric?.id ?? null,
  };
});

const curatedNormalized = curated.map((item) => ({ ...item, review_status: "curated", skill_ids: ["identify_thesis", "recall_legal_basis", "apply_rule_to_facts", "derive_legal_consequence"] }));
const thesisUnits = {
  generated_at: new Date().toISOString().slice(0, 10),
  audit: {
    curated_units: curated.length,
    curated_ids_overlapping_exam_tags: curated.filter((item) => examThesisIds.includes(item.id)).length,
    official_exam_thesis_ids: examThesisIds.length,
    generated_missing_units: generated.length,
    total_deep_units: curated.length + generated.length,
    explanation: "Os 20 cartões editoriais existentes incluíam 3 agregações/renomeações fora dos 74 IDs usados nas provas; por isso 57 IDs oficiais estavam sem unidade e o total normalizado é 77.",
  },
  units: [...curatedNormalized, ...generated],
};

const edges = [];
for (const exam of exams) for (const thesisId of exam.theses) edges.push({ from: `thesis:${thesisId}`, to: `exam:${exam.exam_id}`, type: "appears_in" });
for (const unit of thesisUnits.units) {
  for (const skillId of unit.skill_ids ?? []) edges.push({ from: `thesis:${unit.id}`, to: `skill:${skillId}`, type: "trains" });
  for (const rule of unit.legal_basis ?? []) edges.push({ from: `thesis:${unit.id}`, to: `legal_rule:${rule}`, type: "grounded_in" });
}
for (const pair of confusionPairs) edges.push({ from: `concept:${pair.left}`, to: `concept:${pair.right}`, type: "confusable_with", decisive_fact: pair.decisive_fact });
for (const [from, to] of [["identify_piece", "identify_procedural_stage"], ["apply_rule_to_facts", "identify_thesis"], ["derive_legal_consequence", "apply_rule_to_facts"], ["formulate_request", "derive_legal_consequence"], ["structure_argument", "identify_thesis"], ["structure_argument", "apply_rule_to_facts"]]) edges.push({ from: `skill:${from}`, to: `skill:${to}`, type: "requires" });

const graph = {
  generated_at: thesisUnits.generated_at,
  definitions: taxonomy.definitions,
  nodes: {
    domains: taxonomy.domains,
    topics: taxonomy.topics,
    skills: taxonomy.skills,
    theses: thesisUnits.units,
    exams: exams.map((exam) => ({ id: exam.exam_id, label: exam.exam_label, source_url: exam.source_url })),
  },
  edges,
};

fs.writeFileSync(new URL("../data/thesis-units.json", import.meta.url), `${JSON.stringify(thesisUnits, null, 2)}\n`);
fs.writeFileSync(new URL("../data/knowledge-graph.json", import.meta.url), `${JSON.stringify(graph, null, 2)}\n`);
console.log(`OK: ${curated.length} unidades curadas + ${generated.length} unidades geradas; ${edges.length} relações.`);
