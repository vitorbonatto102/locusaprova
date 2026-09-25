const DAY = 86_400_000;

export function cebraspeScore(answer, correctAnswer) {
  if (answer === null || answer === undefined) return 0;
  return answer === correctAnswer ? 1 : -1;
}

export function scoreObjective({ strategy, answer, correctAnswer }) {
  if (strategy === "cebraspe_true_false") return cebraspeScore(answer, correctAnswer);
  if (answer === null || answer === undefined) return 0;
  return answer === correctAnswer ? 1 : 0;
}

/** @param {{tree: any[], questions: any[], mastery?: any[], reviews?: any[], errors?: any[], now?: Date}} input */
export function buildReviewCards({ tree, questions, mastery = [], reviews = [], errors = [], now = new Date() }) {
  const masteryMap = new Map(mastery.map((row) => [row.knowledgeNodeId, row]));
  const questionsByTopic = new Map();
  for (const question of questions) for (const topicId of question.topicIds) questionsByTopic.set(topicId, [...(questionsByTopic.get(topicId) ?? []), question]);
  const cards = [];
  for (const subject of tree) for (const topic of subject.topics) {
    const topicQuestions = questionsByTopic.get(topic.id) ?? [];
    if (topicQuestions.length < 3) continue;
    const evidence = masteryMap.get(topic.id);
    const openReviews = reviews.filter((row) => row.knowledgeNodeId === topic.id && !row.completedAt);
    const due = openReviews.filter((row) => new Date(row.scheduledFor) <= now);
    const highConfidenceError = errors.some((row) => row.knowledgeNodeId === topic.id && row.confidence >= 4 && !row.resolvedAt);
    const overdue = due.some((row) => new Date(row.scheduledFor).toDateString() !== now.toDateString());
    let state = "novo"; let priority = 3;
    if (highConfidenceError) { state = "erro de alta confiança"; priority = 0; }
    else if (overdue) { state = "revisão vencida"; priority = 1; }
    else if (due.length) { state = "revisar hoje"; priority = 2; }
    else if (evidence?.mastery >= 0.72 && evidence?.evidenceCount >= 4) { state = "forte"; priority = 5; }
    else if (evidence) { state = "aprendendo"; priority = 4; }
    cards.push({ topicId: topic.id, topicName: topic.name, subjectId: subject.id, subjectName: subject.name, mastery: evidence?.mastery ?? null, state, priority, dueCount: due.length, questionCount: topicQuestions.length });
  }
  return cards.sort((a, b) => a.priority - b.priority || (a.mastery ?? -1) - (b.mastery ?? -1));
}

export function classifyObjectiveError({ isCorrect, confidence }) {
  if (isCorrect) return null;
  if (confidence >= 4) return "misconception";
  if (confidence <= 2) return "knowledge-gap";
  return "reasoning-slip";
}

export function updateKnowledgeMastery({ priorMastery = 0, priorStability = 0.5, evidenceCount = 0, isCorrect, confidence = 3, difficulty = 1, now = new Date() }) {
  const confidenceWeight = 0.8 + confidence * 0.08;
  const difficultyWeight = 0.9 + Math.min(3, difficulty) * 0.08;
  const learningRate = Math.max(0.08, 0.24 / Math.sqrt(evidenceCount + 1));
  const target = isCorrect ? Math.min(0.92, 0.68 + difficulty * 0.05) : Math.max(0.03, 0.18 - confidence * 0.02);
  const nextMastery = Math.max(0.03, Math.min(0.95, priorMastery + (target - priorMastery) * learningRate * confidenceWeight * difficultyWeight));
  const nextStability = isCorrect
    ? Math.min(45, Math.max(0.75, priorStability * (1.25 + confidence * 0.08)))
    : Math.max(0.2, priorStability * (confidence >= 4 ? 0.35 : 0.55));
  const intervalHours = isCorrect
    ? Math.max(18, nextStability * 24)
    : confidence >= 4 ? 6 : confidence === 3 ? 18 : 30;
  const state = nextMastery >= 0.72 && evidenceCount >= 3 ? "stable" : nextMastery >= 0.42 ? "developing" : "learning";
  return {
    mastery: Number(nextMastery.toFixed(4)),
    stabilityDays: Number(nextStability.toFixed(3)),
    evidenceCount: evidenceCount + 1,
    state,
    nextReviewAt: new Date(now.getTime() + intervalHours * 3_600_000),
  };
}

export function buildDiagnosticQuestions(questions, count = 20) {
  const bySubject = new Map();
  for (const question of questions) {
    const rows = bySubject.get(question.subjectId) ?? [];
    rows.push(question);
    bySubject.set(question.subjectId, rows);
  }
  const selected = [];
  const subjects = [...bySubject.keys()];
  let offset = 0;
  while (selected.length < Math.min(count, questions.length)) {
    let added = false;
    for (const subject of subjects) {
      const row = bySubject.get(subject)?.[offset];
      if (row && selected.length < count) {
        selected.push(row);
        added = true;
      }
    }
    if (!added) break;
    offset += 1;
  }
  return selected;
}

function mostRelevantMastery(question, masteryMap) {
  const rows = question.topicIds.map((id) => masteryMap.get(id)).filter(Boolean);
  if (!rows.length) return null;
  return rows.reduce((lowest, row) => row.mastery < lowest.mastery ? row : lowest, rows[0]);
}

/** @param {{questions: any[], mastery?: any[], reviews?: any[], attempts?: any[], minutes?: number, now?: Date}} input */
export function buildAdaptivePlan({ questions, mastery = [], reviews = [], attempts = [], minutes = 30, now = new Date() }) {
  const masteryMap = new Map(mastery.map((row) => [row.knowledgeNodeId, row]));
  const dueNodes = new Set(reviews.filter((row) => !row.completedAt && new Date(row.scheduledFor) <= now).map((row) => row.knowledgeNodeId));
  const recentCount = new Map();
  for (const attempt of attempts.slice(0, 80)) recentCount.set(attempt.questionId, (recentCount.get(attempt.questionId) ?? 0) + 1);
  const scored = questions.map((question) => {
    const observed = mostRelevantMastery(question, masteryMap);
    const due = question.topicIds.some((id) => dueNodes.has(id));
    const unseen = !observed;
    const masteryGap = unseen ? 0.6 : 1 - observed.mastery;
    const forgetting = observed ? Math.max(0, (now - new Date(observed.lastReviewedAt)) / DAY) / Math.max(0.5, observed.stabilityDays) : 1;
    const exposurePenalty = (recentCount.get(question.id) ?? 0) * 0.22;
    const score = (due ? 2.2 : 0) + masteryGap * 1.4 + Math.min(1.5, forgetting) * 0.55 + question.difficulty * 0.08 - exposurePenalty;
    const reason = due ? "Revisão vencida" : unseen ? "Ainda não medido" : masteryGap > 0.55 ? "Baixo domínio" : "Consolidação";
    return { question, score, reason };
  }).sort((a, b) => b.score - a.score);
  const desired = Math.max(4, Math.min(20, Math.floor(minutes / 1.5)));
  const chosen = [];
  const subjectCounts = new Map();
  while (chosen.length < Math.min(desired, scored.length)) {
    const next = scored.find((entry) => !chosen.includes(entry) && (subjectCounts.get(entry.question.subjectId) ?? 0) <= Math.floor(chosen.length / 3));
    const entry = next ?? scored.find((candidate) => !chosen.includes(candidate));
    if (!entry) break;
    chosen.push(entry);
    subjectCounts.set(entry.question.subjectId, (subjectCounts.get(entry.question.subjectId) ?? 0) + 1);
  }
  return chosen.map((entry, index) => ({ ...entry, order: index + 1 }));
}

export function aggregateKnowledgeTree(tree, masteryRows) {
  const masteryMap = new Map(masteryRows.map((row) => [row.knowledgeNodeId, row]));
  return tree.map((subject) => {
    const topics = subject.topics.map((topic) => {
      const evidence = masteryMap.get(topic.id) ?? null;
      return { ...topic, mastery: evidence?.mastery ?? null, evidenceCount: evidence?.evidenceCount ?? 0, state: evidence?.state ?? "unseen" };
    });
    const measured = topics.filter((topic) => topic.evidenceCount > 0);
    const evidenceCount = measured.reduce((total, topic) => total + topic.evidenceCount, 0);
    const mastery = measured.length ? measured.reduce((total, topic) => total + topic.mastery * Math.max(1, topic.evidenceCount), 0) / Math.max(1, evidenceCount) : null;
    return { ...subject, topics, mastery, measuredTopics: measured.length, totalTopics: topics.length, evidenceCount };
  });
}

export function overlapExamTargets(current, next) {
  const currentNodes = new Set(current.knowledgeNodeIds);
  const nextNodes = new Set(next.knowledgeNodeIds);
  const shared = [...nextNodes].filter((id) => currentNodes.has(id));
  return {
    shared,
    newNodes: [...nextNodes].filter((id) => !currentNodes.has(id)),
    noLongerRequired: [...currentNodes].filter((id) => !nextNodes.has(id)),
    overlapRatio: nextNodes.size ? shared.length / nextNodes.size : 0,
  };
}

export function countKnowledgeTree(tree) {
  return tree.reduce((totals, subject) => ({
    subjects: totals.subjects + 1,
    topics: totals.topics + subject.topics.length,
    subtopics: totals.subtopics + subject.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0),
  }), { subjects: 0, topics: 0, subtopics: 0 });
}
