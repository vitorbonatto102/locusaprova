import { normalizeLegalText, priorityScore, interleave } from "./learning.mjs";

const CONCEPTS = [
  "desistência voluntária", "crime impossível", "arrependimento eficaz", "arrependimento posterior",
  "atipicidade da conduta", "legítima defesa", "estado de necessidade", "erro de tipo", "erro de proibição",
  "prescrição da pretensão", "extinção da punibilidade", "ausência de justa causa", "inépcia da denúncia",
  "prova ilícita", "nulidade", "absolvição sumária", "rejeição da denúncia", "recurso em sentido estrito",
  "embargos de declaração", "agravo em execução", "habeas corpus", "regime inicial", "substituição da pena",
  "confissão espontânea", "menoridade relativa", "continuidade delitiva", "concurso formal", "perempção",
  "relaxamento da prisão", "prisão domiciliar", "suspensão condicional", "acordo de não persecução penal",
];

export function requiredTermsFromOfficialText(text = "") {
  const normalized = normalizeLegalText(text);
  const concepts = CONCEPTS.filter((term) => normalized.includes(normalizeLegalText(term))).slice(0, 2);
  const citations = [...text.matchAll(/Art\.\s*\d+[ºo]?(?:\s*,\s*(?:§\s*\d+[ºo]?|inciso\s+[IVXLCDM]+))?/gi)]
    .map((match) => match[0].replace(/\s+/g, " "))
    .slice(0, 2);
  if (concepts.length || citations.length) return [...new Set([...concepts, ...citations])].slice(0, 3);
  const stop = new Set(["deve", "deveria", "tendo", "vista", "forma", "termos", "porque", "para", "pela", "pelo", "como", "uma", "com", "sem", "ser", "que", "dos", "das"]);
  const words = normalized.split(" ").filter((word) => word.length >= 7 && !stop.has(word));
  return [...new Set(words)].slice(0, 2);
}

export function rubricForUnit(unit) {
  if (unit.rubric_items?.length) {
    return unit.rubric_items.map((item) => ({
      criterion: `Critério ${item.official_label}: ${cleanOfficialText(item.official_text)}`,
      points: item.official_score_max,
      required_terms: requiredTermsFromOfficialText(item.official_text),
      officialRubricItemId: item.id,
      scoring: "official",
    }));
  }
  const components = unit.pedagogical_rubric ?? [];
  const totalCents = Math.round(unit.official_total_score * 100);
  const baseCents = components.length ? Math.floor(totalCents / components.length) : totalCents;
  return components.map((item, index) => ({
    criterion: item.label,
    points: (index === components.length - 1
      ? totalCents - baseCents * (components.length - 1)
      : baseCents) / 100,
    required_terms: requiredTermsFromOfficialText(item.expected),
    officialRubricItemId: null,
    scoring: "transparent_pedagogical_weight",
  }));
}

export function cleanExamText(value = "") {
  const cleaned = value
    .replace(/(?:[XLCVI]+|\d+º)\s+Exame de Ordem Unificado[\s\S]*$/i, "")
    .replace(/“O gabarito preliminar[\s\S]*$/i, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\bArt\s*\.\s*/gi, "Art. ")
    .replace(/§\s*(\d+)\s*º/g, "§ $1º")
    .replace(/\s+/g, " ")
    .trim();
  const repairs = [
    [/\bd a\b/gi, "da"], [/\bd os\b/gi, "dos"], [/\bn a\b/gi, "na"], [/\bao s\b/gi, "aos"], [/\bo s\b/gi, "os"],
    [/\bfor a\b/gi, "fora"], [/\bpeç a\b/gi, "peça"], [/\bqualifica do\b/gi, "qualificado"],
    [/\bacom panharam\b/gi, "acompanharam"], [/\bas sim\b/gi, "assim"], [/\bde ixaram\b/gi, "deixaram"],
    [/\breg ião\b/gi, "região"], [/\bi ntegrante\b/gi, "integrante"], [/\bmilí cia\b/gi, "milícia"],
    [/\bsalie ntando-se\b/gi, "salientando-se"], [/\bprátic a\b/gi, "prática"], [/\bcumpr ida\b/gi, "cumprida"],
    [/\bd ia\b/gi, "dia"], [/\bpres o\b/gi, "preso"], [/\breal izadas\b/gi, "realizadas"],
    [/\bP oliciais\b/g, "Policiais"], [/\barrombame nto\b/gi, "arrombamento"],
    [/\binimputabilida de\b/gi, "inimputabilidade"], [/\binimput ável\b/gi, "inimputável"],
    [/\bJ ustifique\b/g, "Justifique"], [/\bpo ntuação\b/gi, "pontuação"],
  ];
  return repairs.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), cleaned);
}

export function cleanOfficialText(value = "") {
  const withoutPageFurniture = value
    .replace(/^\s*(?:[XLCVI]+|\d+º)\s+EXAME DE ORDEM UNIFICADO\s*$/gim, " ")
    .replace(/^\s*PROVA PRÁTICO-PROFISSIONAL[^\n]*$/gim, " ")
    .replace(/^\s*“?O gabarito preliminar[^\n]*$/gim, " ")
    .replace(/^\s*Padrão de Resposta Página[^\n]*$/gim, " ")
    .replace(/^\s*Prova Prático-Profissional\s*[–-][^\n]*$/gim, " ")
    .replace(/^\s*\d+(?:,\d+)?(?:\/\d+(?:,\d+)?)+\s*$/gim, " ");
  return cleanExamText(withoutPageFurniture);
}

function questionParts(statement = "") {
  const text = cleanExamText(statement);
  const markers = [...text.matchAll(/(?:^|\s)([AB])\s*\)/g)].map((match) => ({ label: match[1], index: match.index + match[0].indexOf(match[1]) }));
  if (!markers.length) return { context: text, items: new Map() };
  const context = text.slice(0, markers[0].index).trim();
  const items = new Map();
  markers.forEach((marker, index) => {
    const end = markers[index + 1]?.index ?? text.length;
    const question = text.slice(marker.index, end).replace(new RegExp(`^${marker.label}\\s*\\)\\s*`), "")
      .replace(/\(\s*Valor\s*:[^)]+\)/gi, "")
      .replace(/\s*Obs\.:.*$/i, "")
      .trim();
    items.set(marker.label, question);
  });
  return { context, items };
}

function questionItemLabel(label = "") {
  return String(label).trim().toUpperCase().startsWith("B") ? "B" : "A";
}

export function questionToTrainingItems(unit) {
  const { context, items } = questionParts(unit.statement);
  const groups = new Map();
  for (const rubricItem of unit.rubric_items ?? []) {
    const label = questionItemLabel(rubricItem.official_label);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(rubricItem);
  }
  if (!groups.size) return [unitToTrainingItem(unit, null)];
  return [...groups.entries()].map(([label, rubricItems]) => {
    const officialText = rubricItems.map((item) => item.official_text).join(" ");
    return {
      id: `${unit.id}:item-${label}`,
      unitId: unit.id,
      rubricItemId: null,
      examId: unit.exam_id,
      examLabel: unit.exam_label,
      title: `${unit.exam_label} · Questão ${unit.question_number} · Item ${label}`,
      kind: "discursive",
      prompt: context,
      question: items.get(label) || `Responda ao item ${label}, aplicando o direito aos fatos narrados.`,
      answer: officialText,
      rubric: rubricItems.map((item) => ({
        criterion: `Componente ${label}`,
        points: item.official_score_max,
        required_terms: requiredTermsFromOfficialText(item.official_text),
        officialRubricItemId: item.id,
        scoring: "official",
      })),
      skillIds: [...new Set(rubricItems.flatMap((item) => item.skill_ids ?? []))],
      thesisIds: unit.thesis_ids,
      estimatedMinutes: 3,
      source: unit.source,
      validationStatus: unit.review.status,
    };
  });
}

export function exerciseToTrainingItem(exercise) {
  const kindTitles = {
    piece_identification: "Identifique a peça",
    thesis_hunt: "Encontre a tese",
    complete_foundation: "Complete a fundamentação",
    fact_to_thesis: "Do fato à tese",
    piece_structure: "Estruture a peça",
    thesis_writing: "Redija a tese",
    discursive: "Questão discursiva",
  };
  const kindQuestions = {
    complete_foundation: "Complete a frase com a tese e o dispositivo legal.",
    piece_structure: "Escreva o esqueleto na ordem em que você redigiria a peça.",
    thesis_writing: "Redija um parágrafo de tese completo.",
    discursive: "Responda aos dois pontos de forma objetiva e fundamentada.",
  };
  return {
    id: exercise.id,
    unitId: `curated:${exercise.id}`,
    examId: exercise.exam_id,
    examLabel: exercise.exam_id.replace("oab-", "OAB ").replace("-penal", " · Penal"),
    title: kindTitles[exercise.kind] ?? "Treino orientado",
    kind: exercise.kind,
    prompt: cleanExamText(exercise.prompt),
    question: exercise.question ?? kindQuestions[exercise.kind] ?? "Escreva a resposta jurídica completa.",
    answer: exercise.model_paragraph ?? exercise.answer,
    rubric: exercise.rubric,
    skillIds: [exercise.id],
    thesisIds: [],
    estimatedMinutes: exercise.kind === "piece_structure" ? 4 : 3,
    source: { url: exercise.source?.source_url, page_start: exercise.source?.page, publisher: "FGV" },
    validationStatus: exercise.validation_status,
    options: exercise.options ?? null,
    hints: exercise.hints ?? null,
  };
}

export function adaptiveDrillToTrainingItem(drill) {
  const skillIds = [...new Set([...(drill.skill_ids ?? []), ...(drill.thesis_ids ?? []).map((id) => `thesis:${id}`)])];
  return {
    id: drill.id,
    unitId: `adaptive:${drill.id}`,
    rubricItemId: null,
    examId: "autoral-oab-penal",
    examLabel: "Treino autoral",
    title: drill.title ?? "Treino orientado",
    kind: drill.kind,
    prompt: drill.prompt,
    question: drill.question,
    answer: drill.answer,
    rubric: drill.rubric,
    skillIds: skillIds.length ? skillIds : [drill.id],
    thesisIds: drill.thesis_ids ?? [],
    estimatedMinutes: drill.estimated_minutes ?? 4,
    source: { publisher: "Locus", document_type: "authorial_microdrill", url: null, page_start: null },
    validationStatus: "editorial_verified",
    options: drill.options ?? null,
    hints: drill.hints ?? null,
  };
}

export function unitToTrainingItem(unit, rubricItem = unit.rubric_items?.[0]) {
  if (unit.kind === "question" && rubricItem) {
    const label = questionItemLabel(rubricItem.official_label);
    return questionToTrainingItems(unit).find((item) => item.id.endsWith(`item-${label}`));
  }
  const officialText = rubricItem?.official_text ?? unit.pedagogical_rubric?.[0]?.expected ?? unit.official_commentary;
  const points = rubricItem?.official_score_max ?? unit.official_total_score;
  return {
    id: rubricItem ? `${unit.id}:${rubricItem.id}` : `${unit.id}:complete`,
    unitId: unit.id,
    rubricItemId: rubricItem?.id ?? null,
    examId: unit.exam_id,
    examLabel: unit.exam_label,
    title: unit.kind === "piece" ? `Peça · ${unit.title}` : `${unit.exam_label} · Questão ${unit.question_number}`,
    kind: unit.kind === "piece" ? "piece_rubric" : "discursive",
    prompt: cleanExamText(unit.statement),
    question: rubricItem
      ? unit.kind === "piece"
        ? `Redija o trecho da peça que atende ao item ${rubricItem.official_label}.`
        : `Redija a resposta ao item ${rubricItem.official_label}.`
      : "Responda de forma completa: tese, aplicação, fundamento e consequência.",
    answer: officialText,
    rubric: [{
      criterion: rubricItem ? `Critério ${rubricItem.official_label}` : "Resposta jurídica",
      points,
      required_terms: requiredTermsFromOfficialText(officialText),
      officialRubricItemId: rubricItem?.id ?? null,
      scoring: rubricItem ? "official" : "transparent_pedagogical_weight",
    }],
    skillIds: rubricItem?.skill_ids ?? unit.skill_ids,
    thesisIds: unit.thesis_ids,
    estimatedMinutes: unit.kind === "piece" ? 4 : 3,
    source: unit.source,
    validationStatus: unit.review.status,
  };
}

export function confusionToTrainingItem(pair) {
  return {
    id: `nao-confunda:${pair.id}`,
    unitId: null,
    rubricItemId: null,
    examId: "sintetico-transparente",
    examLabel: "Não Confunda",
    title: `${pair.left} × ${pair.right}`,
    kind: "not_confuse",
    prompt: pair.decisive_fact,
    question: `Explique o fato decisivo, o fundamento e a consequência que separam ${pair.left} de ${pair.right}.`,
    answer: `${pair.left}: ${pair.left_requirements.join("; ")} — ${pair.left_legal_basis} — ${pair.left_consequence} ${pair.right}: ${pair.right_requirements.join("; ")} — ${pair.right_legal_basis} — ${pair.right_consequence}`,
    rubric: [
      { criterion: `Requisitos de ${pair.left}`, points: 0.35, required_terms: [pair.left, ...requiredTermsFromOfficialText(pair.left_legal_basis)], scoring: "transparent_pedagogical_weight" },
      { criterion: `Requisitos de ${pair.right}`, points: 0.35, required_terms: [pair.right, ...requiredTermsFromOfficialText(pair.right_legal_basis)], scoring: "transparent_pedagogical_weight" },
      { criterion: "Fato decisivo e consequências", points: 0.3, required_terms: requiredTermsFromOfficialText(pair.decisive_fact), scoring: "transparent_pedagogical_weight" },
    ],
    skillIds: ["identify_thesis", "apply_rule_to_facts", "derive_legal_consequence"],
    thesisIds: [pair.id],
    estimatedMinutes: 4,
    source: { publisher: "Locus Penal", document_type: "transparent_synthetic_template", url: null, page_start: null },
    validationStatus: "editorial_transparent",
  };
}

function dayIndex(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
}

function stableOrderKey(id) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** @param {{ adaptiveDrills?: any[], confusionPairs?: any[], mastery?: any[], errors?: any[], recentAttempts?: any[], minutes?: number, date?: Date }} options */
export function buildDailyPlan({ adaptiveDrills = [], confusionPairs = [], mastery = [], errors = [], recentAttempts = [], minutes = 30, date = new Date() }) {
  const masteryMap = new Map(mastery.map((item) => [item.skillId, Number(item.mastery) || 0]));
  const errorMap = new Map();
  for (const error of errors.filter((item) => !item.resolved)) errorMap.set(error.exerciseId, (errorMap.get(error.exerciseId) ?? 0) + 1);
  const lastAttemptById = new Map();
  for (const attempt of recentAttempts) {
    const attemptTime = new Date(attempt.createdAt).getTime();
    if (Number.isFinite(attemptTime) && attemptTime > (lastAttemptById.get(attempt.exerciseId) ?? 0)) {
      lastAttemptById.set(attempt.exerciseId, attemptTime);
    }
  }
  const day = dayIndex(date);
  const orderedDrills = [...adaptiveDrills].sort((a, b) => stableOrderKey(a.id) - stableOrderKey(b.id) || a.id.localeCompare(b.id));
  const authorialCandidates = orderedDrills.map((drill, index) => {
    const item = adaptiveDrillToTrainingItem(drill);
    const itemMastery = item.skillIds.length
      ? item.skillIds.reduce((sum, skill) => sum + (masteryMap.get(skill) ?? 0), 0) / item.skillIds.length
      : 0;
    const errorCount = errorMap.get(item.id) ?? 0;
    const overdueDays = Math.max(0, ...mastery.filter((entry) => item.skillIds.includes(entry.skillId)).map((entry) => {
      const due = new Date(entry.nextReviewAt).getTime();
      return Math.floor((date.getTime() - due) / 86400000);
    }), 0);
    const rotation = (index - (day * 7) % orderedDrills.length + orderedDrills.length) % orderedDrills.length;
    const daysSinceAttempt = (date.getTime() - (lastAttemptById.get(item.id) ?? 0)) / 86400000;
    const recentPenalty = overdueDays > 0 || !lastAttemptById.has(item.id)
      ? 0
      : daysSinceAttempt < 1 ? 18 : daysSinceAttempt < 3 ? 12 : daysSinceAttempt < 7 ? 6 : 0;
    return {
      ...item,
      priority: priorityScore({ mastery: itemMastery, overdueDays, confidenceError: errorCount > 0, errorCount, recency: 1 - rotation / orderedDrills.length }) - recentPenalty,
    };
  });
  authorialCandidates.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const special = confusionPairs.length ? confusionToTrainingItem(confusionPairs[day % confusionPairs.length]) : null;
  const pool = interleave(special ? [special, ...authorialCandidates] : authorialCandidates, (item) => item.kind);
  const activities = [];
  let used = 0;
  for (const item of pool) {
    if (activities.some((entry) => entry.unitId && entry.unitId === item.unitId)) continue;
    if (item.thesisIds[0] && activities.some((entry) => entry.thesisIds[0] === item.thesisIds[0])) continue;
    if (used + item.estimatedMinutes > minutes && activities.length >= 3) continue;
    activities.push(item);
    used += item.estimatedMinutes;
    if (used >= minutes - 1 || activities.length >= 11) break;
  }
  const groups = Object.values(activities.reduce((acc, item) => {
    const key = item.kind === "not_confuse"
      ? "Não Confunda"
      : ["piece_identification", "piece_structure"].includes(item.kind)
        ? "Peça e estrutura"
        : ["thesis_writing", "fact_to_thesis"].includes(item.kind)
          ? "Aplicação e redação"
          : "Teses e fundamentação";
    acc[key] ??= { name: key, count: 0, minutes: 0 };
    acc[key].count += 1;
    acc[key].minutes += item.estimatedMinutes;
    return acc;
  }, {}));
  return {
    date: date.toISOString().slice(0, 10),
    requestedMinutes: minutes,
    estimatedMinutes: used,
    activityCount: activities.length,
    recalculatesAfterEveryAttempt: true,
    activities,
    groups,
    rationale: "Microcasos autorais priorizados por baixo domínio, revisão vencida, erros confiantes e variedade diária; casos respondidos recentemente cedem lugar a alternativas. Nenhuma questão de prova é usada nesta sessão.",
  };
}

export function resolveAdaptiveTrainingItem(id, confusionPairs = [], adaptiveDrills = []) {
  const drill = adaptiveDrills.find((item) => item.id === id);
  if (drill) return adaptiveDrillToTrainingItem(drill);
  if (id.startsWith("nao-confunda:")) {
    const pair = confusionPairs.find((item) => `nao-confunda:${item.id}` === id);
    return pair ? confusionToTrainingItem(pair) : null;
  }
  return null;
}

export function resolveTrainingItem(id, units, confusionPairs = [], exercises = [], adaptiveDrills = []) {
  const adaptive = resolveAdaptiveTrainingItem(id, confusionPairs, adaptiveDrills);
  if (adaptive) return adaptive;
  const curated = exercises.find((item) => item.id === id);
  if (curated) return exerciseToTrainingItem(curated);
  const [unitId, rubricId] = id.split(":");
  const unit = units.find((item) => item.id === unitId);
  if (!unit) return null;
  if (unit.kind === "question" && rubricId?.startsWith("item-")) {
    return questionToTrainingItems(unit).find((item) => item.id === id) ?? null;
  }
  const rubricItem = unit.rubric_items?.find((item) => item.id === rubricId) ?? null;
  return unitToTrainingItem(unit, rubricItem);
}
