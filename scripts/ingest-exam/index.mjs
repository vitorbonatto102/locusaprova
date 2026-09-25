import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2];
const keyPath = process.argv[3];
if (!input || !keyPath) throw new Error("Uso: npm run ingest:exam -- prova.pdf gabarito.json [url-oficial]");
const absolute = resolve(input);
const keyAbsolute = resolve(keyPath);
let text;
if (extname(absolute).toLowerCase() === ".pdf") {
  const result = spawnSync("pdftotext", ["-layout", absolute, "-"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("pdftotext não está disponível ou o PDF não pôde ser lido.");
  text = result.stdout;
} else text = await readFile(absolute, "utf8");
const [buffer, answerKey] = await Promise.all([readFile(absolute), readFile(keyAbsolute, "utf8").then(JSON.parse)]);
const output = resolve("data/raw/exams", `${basename(absolute, extname(absolute))}.candidate.json`);
await mkdir(resolve("data/raw/exams"), { recursive: true });
await writeFile(output, JSON.stringify({
  source: { file: basename(absolute), answerKeyFile: basename(keyAbsolute), url: process.argv[4] ?? null, sha256: createHash("sha256").update(buffer).digest("hex"), ingestedAt: new Date().toISOString() },
  validationStatus: "parsed_candidate", publishable: false,
  reviewChecklist: ["Segmentar itens manualmente", "Vincular tópicos da árvore", "Conferir gabarito definitivo", "Resolver anuladas/alteradas", "Revisar direitos autorais e proveniência"],
  answerKey, extractedText: text,
}, null, 2));
console.log(`Candidato salvo em ${output}. Nenhuma questão foi publicada.`);
