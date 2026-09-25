import { readFile } from "node:fs/promises";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const notice = await load("../data/police/pf-agent-2025.json");
const questions = await load("../data/police/questions.json");
const topics = notice.knowledgeTree.flatMap((subject) => subject.topics);
const invalid = questions.filter((question) => question.isOfficial || !question.source?.url || !question.validationStatus);
if (invalid.length) throw new Error(`Questões inválidas: ${invalid.map((item) => item.id).join(", ")}`);
console.log(JSON.stringify({
  notice: notice.id,
  subjectsMapped: notice.subjectsInNotice.length,
  subjectsDeep: notice.subjectsInNotice.filter((subject) => subject.contentStatus === "deep").length,
  topics: topics.length,
  subtopics: topics.reduce((total, topic) => total + topic.subtopics.length, 0),
  questions: questions.length,
  officialQuestions: questions.filter((question) => question.isOfficial).length,
  authorialQuestions: questions.filter((question) => !question.isOfficial).length,
  status: "seed bundle valid; runtime insertion remains idempotent",
}, null, 2));
