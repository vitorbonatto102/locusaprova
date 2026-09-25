import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2];
if (!input) throw new Error("Uso: npm run ingest:notice -- caminho/edital.pdf [url-oficial]");
const absolute = resolve(input);
let text;
if (extname(absolute).toLowerCase() === ".pdf") {
  const result = spawnSync("pdftotext", ["-layout", absolute, "-"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("pdftotext não está disponível ou o PDF não pôde ser lido.");
  text = result.stdout;
} else text = await readFile(absolute, "utf8");
const buffer = await readFile(absolute);
const output = resolve("data/raw/notices", `${basename(absolute, extname(absolute))}.candidate.json`);
await mkdir(resolve("data/raw/notices"), { recursive: true });
await writeFile(output, JSON.stringify({
  source: { file: basename(absolute), url: process.argv[3] ?? null, sha256: createHash("sha256").update(buffer).digest("hex"), ingestedAt: new Date().toISOString() },
  validationStatus: "parsed_candidate",
  publishable: false,
  reviewChecklist: ["Conferir cargo, banca, data e páginas", "Conferir estrutura e regra de pontuação", "Conferir cada item do conteúdo programático", "Registrar parecer humano antes de marcar verified"],
  extractedText: text,
}, null, 2));
console.log(`Candidato salvo em ${output}. Nenhum conteúdo foi publicado.`);
