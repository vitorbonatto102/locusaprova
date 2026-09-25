import { getDb } from "@/db";
import { boards, careers, examCategories, examNoticeKnowledge, examNotices, examTargets, institutions, knowledgeNodes, positions, questionBank, questionKnowledgeNodes } from "@/db/schema";
import { flattenKnowledgeTrees, getPoliceProgramByTargetId, getPoliceProgramByTrackId, policePrograms, policeTargets } from "@/lib/police-data";
import { getActiveTrackId } from "@/lib/user-context";

export async function getActivePoliceProgram(db: ReturnType<typeof getDb>, userId: string) {
  const program = getPoliceProgramByTrackId(await getActiveTrackId(db, userId));
  if (!program) throw new Error("Objetivo policial ativo não encontrado");
  return program;
}

export async function ensurePoliceCatalog(db: ReturnType<typeof getDb>, now = new Date()) {
  await db.insert(examCategories).values({ id: policeTargets.category.id, name: policeTargets.category.name, createdAt: now }).onConflictDoNothing();
  await db.insert(careers).values({ id: policeTargets.career.id, categoryId: policeTargets.category.id, name: policeTargets.career.name, createdAt: now }).onConflictDoNothing();
  await db.insert(boards).values(policeTargets.boards.map((board) => ({ id: board.id, name: board.name, profileJson: JSON.stringify({ scoringStrategies: board.scoringStrategies }), createdAt: now }))).onConflictDoNothing();
  await db.insert(institutions).values(policeTargets.institutions.map((institution) => ({ ...institution, careerId: policeTargets.career.id, createdAt: now }))).onConflictDoNothing();
  await db.insert(positions).values(policeTargets.positions.map((position) => ({ ...position, createdAt: now }))).onConflictDoNothing();
  await db.insert(examNotices).values([
    ...policePrograms.map((program) => ({
      id: program.notice.id, institutionId: program.institutionId, positionId: program.positionId, boardId: "cebraspe",
      title: program.notice.title, publishedAt: program.notice.publishedAt, scoringStrategy: program.notice.objectiveExam.scoringStrategy,
      rulesJson: JSON.stringify({ stages: program.notice.stages, objectiveExam: program.notice.objectiveExam, discursiveExam: program.notice.discursiveExam }),
      sourceUrl: program.notice.source.sourceUrl, sourceDocument: program.notice.source.sourceDocument,
      retrievedAt: new Date(program.notice.retrievedAt), validationStatus: program.notice.source.validationStatus,
    })),
    {
      id: "pc-rs-2025-edital-6", institutionId: "pc-rs", positionId: "pc-rs-inspector", boardId: "fundatec",
      title: "Edital nº 06/2025 — PC-RS — Inspetor", publishedAt: "2025-10-24", scoringStrategy: "standard_multiple_choice",
      rulesJson: JSON.stringify({ purpose: "structural_generalization_test" }),
      sourceUrl: "https://www.pc.rs.gov.br/upload/arquivos/202510/24083812-edital-de-abertura-agentes-admin-correto.pdf",
      sourceDocument: "Edital nº 06/2025 — Polícia Civil do Rio Grande do Sul", retrievedAt: now, validationStatus: "verified",
    },
  ]).onConflictDoNothing();
  await db.insert(examTargets).values(policeTargets.targets.map((target) => ({
    id: target.id, categoryId: policeTargets.category.id, careerId: target.careerId, institutionId: target.institutionId,
    positionId: target.positionId, noticeId: target.noticeId, mode: target.mode, label: target.label, status: target.status,
    createdAt: now, updatedAt: now,
  }))).onConflictDoNothing();
  const nodes = flattenKnowledgeTrees();
  const nodeValues = nodes.map((node) => ({
    id: node.id, parentId: node.parentId, nodeType: node.nodeType, name: node.name, slug: node.slug,
    metadataJson: JSON.stringify(node.metadata), sourceJson: JSON.stringify(node.source), validationStatus: "verified", createdAt: now, updatedAt: now,
  }));
  // D1/SQLite limits the number of bound parameters in a statement.
  for (let index = 0; index < nodeValues.length; index += 8) {
    await db.insert(knowledgeNodes).values(nodeValues.slice(index, index + 8)).onConflictDoNothing();
  }
  const noticeKnowledgeValues = policeTargets.targets.flatMap((target) => target.knowledgeNodeIds.map((nodeId) => {
    const program = getPoliceProgramByTargetId(target.id);
    const topic = program?.notice.knowledgeTree.flatMap((subject) => subject.topics.map((item) => [item.id, { block: subject.block, page: "sourcePage" in subject ? subject.sourcePage : null }] as const)).find(([id]) => id === nodeId)?.[1];
    return {
      id: `${target.id}:${nodeId}`, noticeId: target.noticeId, examTargetId: target.id, knowledgeNodeId: nodeId,
      isRequired: true, relevance: 1, blockId: topic?.block ?? null, sourcePage: typeof topic?.page === "number" ? topic.page : null,
      sourceUrl: program?.notice.source.sourceUrl ?? "https://www.pc.rs.gov.br/upload/arquivos/202510/24083812-edital-de-abertura-agentes-admin-correto.pdf",
    };
  }));
  for (let index = 0; index < noticeKnowledgeValues.length; index += 9) {
    await db.insert(examNoticeKnowledge).values(noticeKnowledgeValues.slice(index, index + 9)).onConflictDoNothing();
  }
  const questionValues = policePrograms.flatMap((program) => program.questions.map((question) => ({
    id: question.id, statement: question.statement, questionType: question.type, correctAnswerJson: JSON.stringify(question.correctAnswer),
    explanation: question.explanation, decisionPoint: question.decisionPoint, misconception: question.misconception,
    boardId: "cebraspe", institutionId: program.institutionId, positionId: program.positionId, examNoticeId: program.notice.id,
    difficulty: question.difficulty, sourceJson: JSON.stringify(question.source), isOfficial: question.isOfficial,
    author: "Locus", reviewer: question.validationStatus === "legal_source_verified" ? "fonte legal conferida" : "revisão editorial",
    legalReviewStatus: question.validationStatus, legalVersion: "legalVersion" in question.source ? question.source.legalVersion ?? null : null,
    validationStatus: "verified", createdAt: now, updatedAt: now,
  })));
  for (let index = 0; index < questionValues.length; index += 4) {
    await db.insert(questionBank).values(questionValues.slice(index, index + 4)).onConflictDoNothing();
  }
  const questionNodeValues = policePrograms.flatMap((program) => program.questions).flatMap((question) => question.topicIds.map((nodeId, index) => ({
    id: `${question.id}:${nodeId}`, questionId: question.id, knowledgeNodeId: nodeId, relation: index === 0 ? "primary" : "secondary",
  })));
  for (let index = 0; index < questionNodeValues.length; index += 20) {
    await db.insert(questionKnowledgeNodes).values(questionNodeValues.slice(index, index + 20)).onConflictDoNothing();
  }
}
