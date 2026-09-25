import pfNotice from "@/data/police/pf-agent-2025.json";
import pfQuestionData from "@/data/police/questions.json";
import prfNotice from "@/data/police/prf-2021.json";
import prfQuestionData from "@/data/police/prf-questions.json";
import targetData from "@/data/police/exam-targets.json";

export type PoliceQuestion = {
  id: string; type: string; statement: string; correctAnswer: boolean; explanation: string;
  decisionPoint: string; misconception: string; subjectId: string; topicIds: string[];
  subtopicIds?: string[]; skills: string[]; difficulty: number; isOfficial: boolean; validationStatus: string;
  source: { kind: string; label?: string; basis: string; url: string; document: string; year?: number; board?: string; page?: number; article?: string; legalVersion?: string; retrievedAt: string };
};

export type PoliceNotice = typeof prfNotice;
export const policeTargets = targetData;
export const PF_TARGET_ID = "pf-agent-2025";
export const PF_TRACK_ID = "public-exams-police-pf-agent-2025";
export const PRF_TARGET_ID = "prf-2021";
export const PRF_TRACK_ID = "public-exams-police-prf";

export const policePrograms = [
  { targetId: PF_TARGET_ID, trackId: PF_TRACK_ID, institutionId: "pf", positionId: "pf-agent", notice: pfNotice as unknown as PoliceNotice, questions: pfQuestionData as PoliceQuestion[] },
  { targetId: PRF_TARGET_ID, trackId: PRF_TRACK_ID, institutionId: "prf", positionId: "prf-policial", notice: prfNotice, questions: prfQuestionData as PoliceQuestion[] },
];
export const policeNotice = pfNotice;
export const policeQuestions = policePrograms.flatMap((program) => program.questions);

export function getPoliceProgramByTrackId(trackId: string) { return policePrograms.find((program) => program.trackId === trackId) ?? null; }
export function getPoliceProgramByTargetId(targetId: string) { return policePrograms.find((program) => program.targetId === targetId) ?? null; }
export function getPoliceQuestion(id: string) { return policeQuestions.find((question) => question.id === id) ?? null; }
export function getPoliceSubjectName(subjectId: string, program = policePrograms[0]) { return program.notice.knowledgeTree.find((subject) => subject.id === subjectId)?.name ?? subjectId; }

export function flattenKnowledgeTrees() {
  const nodes = new Map<string, { id: string; parentId: string | null; nodeType: string; name: string; slug: string; metadata: Record<string, unknown>; source: PoliceNotice["source"] }>();
  for (const program of policePrograms) for (const subject of program.notice.knowledgeTree) {
    const sourcePage = "sourcePage" in subject ? subject.sourcePage : null;
    if (!nodes.has(subject.id)) nodes.set(subject.id, { id: subject.id, parentId: null, nodeType: "subject", name: subject.name, slug: subject.id, metadata: { block: subject.block, sourcePage }, source: program.notice.source });
    for (const topic of subject.topics) {
      if (!nodes.has(topic.id)) nodes.set(topic.id, { id: topic.id, parentId: subject.id, nodeType: "topic", name: topic.name, slug: topic.id, metadata: { block: subject.block, sourcePage }, source: program.notice.source });
      topic.subtopics.forEach((name, index) => { const id = `${topic.id}--${index + 1}`; if (!nodes.has(id)) nodes.set(id, { id, parentId: topic.id, nodeType: "subtopic", name, slug: `${topic.id}-${index + 1}`, metadata: { block: subject.block, sourcePage }, source: program.notice.source }); });
    }
  }
  return [...nodes.values()];
}
