const DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeLegalText(value = "") {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/\bartigos?\b/g, "art")
    .replace(/\bincisos?\b/g, "inc")
    .replace(/\bparagrafos?\b/g, "§")
    .replace(/[^a-z0-9§ºª]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TERM_ALIASES = {
  "prova ilicita": ["ilicitude da prova", "prova ilegal", "prova obtida ilicitamente"],
  "prova derivada": ["provas derivadas", "frutos da arvore envenenada"],
  "insuficiencia probatoria": ["prova insuficiente", "insuficiencia de provas", "ausencia de prova suficiente", "duvida razoavel"],
  "desentranhamento": ["desentranhar", "exclusao da prova", "retirada da prova"],
  "absolvicao": ["absolver", "absolvido", "absolva"],
  "nulidade": ["anulacao", "anular"],
  "fundamentacao": ["motivacao", "decisao motivada"],
  "causa de aumento": ["majorante"],
  "restritivas de direitos": ["penas restritivas", "pena restritiva"],
  "tentativa": ["forma tentada", "crime tentado"],
  "desistencia voluntaria": ["desistiu voluntariamente", "abandono voluntario"],
  "circunstancia alheia": ["intervencao de terceiro", "impedido por terceiro"],
  "fato novo": ["circunstancia fática nova", "circunstancia fatica nova"],
  "cadeia de custodia": ["rastreabilidade do vestigio", "rastreabilidade da prova"],
  "regime aberto": ["regime inicial aberto"],
};

function stem(word) {
  return word.length > 5 ? word.slice(0, -2) : word;
}

function wordsMatch(text, phrase) {
  const phraseWords = normalizeLegalText(phrase).split(" ").filter(Boolean);
  const textWords = new Set(text.split(" ").filter(Boolean));
  return phraseWords.length > 1 && phraseWords.every((word) => {
    if (/^\d+|^[ivxlcdm]+$|^§|^art$|^inc$/.test(word)) return textWords.has(word);
    const root = stem(word);
    return [...textWords].some((candidate) => candidate.startsWith(root));
  });
}

function termMatches(text, term) {
  const normalizedTerm = normalizeLegalText(term);
  if (!normalizedTerm) return false;
  if (text.includes(normalizedTerm) || wordsMatch(text, normalizedTerm)) return true;
  return (TERM_ALIASES[normalizedTerm] ?? []).some((alias) => text.includes(normalizeLegalText(alias)) || wordsMatch(text, alias));
}

export function evaluateRubric(answer, rubric = [], referenceAnswer = "") {
  const normalized = normalizeLegalText(answer);
  const normalizedReference = normalizeLegalText(referenceAnswer);
  const usedReferenceAnswer = Boolean(normalized && normalizedReference && normalized.includes(normalizedReference));
  const criteria = rubric.map((criterion) => {
    const required = criterion.required_terms ?? [];
    const matches = usedReferenceAnswer ? required : required.filter((term) => termMatches(normalized, term));
    const ratio = usedReferenceAnswer ? 1 : required.length ? matches.length / required.length : 0;
    const earned = Math.round(criterion.points * ratio * 100) / 100;
    return {
      criterion: criterion.criterion,
      earned,
      possible: criterion.points,
      met: ratio === 1,
      matchedTerms: matches,
      missingTerms: required.filter((term) => !matches.includes(term)),
    };
  });
  const score = Math.round(criteria.reduce((sum, item) => sum + item.earned, 0) * 100) / 100;
  const maxScore = Math.round(rubric.reduce((sum, item) => sum + item.points, 0) * 100) / 100;
  return { score, maxScore, ratio: maxScore ? score / maxScore : 0, criteria, usedReferenceAnswer };
}

export function scheduleReview({ previousStability = 1, previousMastery = 0, ratio = 0, confidence = 3, now = new Date() }) {
  const highConfidenceError = ratio < 0.6 && confidence >= 4;
  const quality = Math.max(0, Math.min(1, ratio - Math.max(0, confidence - 3) * (ratio < 0.6 ? 0.08 : 0)));
  const stabilityDays = highConfidenceError
    ? 0.25
    : Math.min(90, Math.max(0.5, previousStability * (0.7 + quality * 1.9)));
  const mastery = Math.max(0, Math.min(1, previousMastery * 0.72 + quality * 0.28));
  const intervalDays = ratio < 0.8 ? Math.min(3, stabilityDays) : mastery >= 0.86 ? Math.max(7, stabilityDays) : mastery >= 0.65 ? Math.max(3, stabilityDays) : stabilityDays;
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86400000);
  const state = mastery >= 0.86 ? "mastered" : mastery >= 0.45 ? "review" : "learning";
  return { mastery, stabilityDays, intervalDays, nextReviewAt, state, highConfidenceError };
}

export function priorityScore({ frequency = 0, mastery = 0, overdueDays = 0, confidenceError = false, errorCount = 0, recency = 0 }) {
  const knowledgeGap = (1 - Math.max(0, Math.min(1, mastery))) * 45;
  const forgettingRisk = Math.min(1, Math.max(0, overdueDays) / 10) * 20;
  const calibrationRisk = confidenceError ? 18 : 0;
  const repeatedError = Math.min(4, Math.max(0, errorCount)) * 2;
  const recentExposure = Math.max(0, Math.min(1, recency)) * 4;
  const historicalFrequency = Math.max(0, Math.min(1, frequency)) * 5;
  return Math.round((knowledgeGap + forgettingRisk + calibrationRisk + repeatedError + recentExposure + historicalFrequency) * 10) / 10;
}

export function interleave(items, getCategory = (item) => item.category) {
  const remaining = [...items];
  const result = [];
  let previous = null;
  while (remaining.length) {
    let index = remaining.findIndex((item) => getCategory(item) !== previous);
    if (index < 0) index = 0;
    const [item] = remaining.splice(index, 1);
    result.push(item);
    previous = getCategory(item);
  }
  return result;
}

export function classifyError(result, confidence) {
  if (result.ratio >= 0.8) return "ajuste-fino";
  if (confidence >= 4) return "erro-de-alta-confianca";
  const misses = result.criteria.flatMap((criterion) => criterion.missingTerms);
  if (misses.some((term) => /art|\d|§/.test(term))) return "fundamentacao";
  if (misses.some((term) => /pedido|absolv|rejei|desentranh/.test(normalizeLegalText(term)))) return "consequencia-pedido";
  return "identificacao-aplicacao";
}
