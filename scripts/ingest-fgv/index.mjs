import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const exams = JSON.parse(await fs.readFile(path.join(root, "data/fgv-penal-exams.json"), "utf8"));
const download = process.argv.includes("--download");

if (!download) {
  console.log(`Manifesto pronto: ${exams.length} padrões oficiais FGV. Use --download para materializar os PDFs em data/raw/fgv.`);
  process.exit(0);
}

const destination = path.join(root, "data/raw/fgv");
await fs.mkdir(destination, { recursive: true });
const manifest = [];
for (const exam of exams) {
  const response = await fetch(exam.source_url, { headers: { "user-agent": "LocusPenalResearch/1.0" } });
  if (!response.ok) throw new Error(`${exam.exam_id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.subarray(0, 4).equals(Buffer.from("%PDF"))) throw new Error(`${exam.exam_id}: resposta não é PDF.`);
  const file = `${exam.exam_id}.pdf`;
  await fs.writeFile(path.join(destination, file), bytes);
  manifest.push({ exam_id: exam.exam_id, file, source_url: exam.source_url, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, downloaded_at: new Date().toISOString() });
  console.log(`${exam.exam_id}: ${bytes.length} bytes`);
}
await fs.writeFile(path.join(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
