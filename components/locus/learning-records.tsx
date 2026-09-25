"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Target } from "lucide-react";
import taxonomy from "@/data/taxonomy.json";
import units from "@/data/exam-units.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type View = "today" | "train" | "mastery" | "radar" | "errors" | "library" | "simulator";
type ProgressData = {
  mastery: { skillId: string; mastery: number; state: string; nextReviewAt: string }[];
  errors: { id: string; exerciseId: string; thesisId?: string | null; category: string; confidence: number; excerpt: string; nextReviewAt: string; createdAt: string }[];
  average: number;
};

function useProgress() {
  const [data, setData] = useState<ProgressData | null>(null), [error, setError] = useState(false);
  useEffect(() => { fetch("/api/progress", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setData).catch(() => setError(true)); }, []);
  return { data, error };
}

export function SkillMasteryMap() {
  const { data, error } = useProgress();
  const bySkill = new Map((data?.mastery ?? []).map((item) => [item.skillId, item]));
  return <><div className="mb-7"><p className="eyebrow">Mapa de domínio</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Domínio por habilidade</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">A unidade de domínio é a operação que você executa — identificar peça, aplicar regra, formular pedido — e não o exercício isolado.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{taxonomy.skills.map((skill) => { const row = bySkill.get(skill.id); const value = Math.round((row?.mastery ?? 0) * 100); const tone = value >= 80 ? "bg-emerald-100" : value >= 55 ? "bg-amber-100" : value > 0 ? "bg-rose-100" : "bg-[var(--mist)]"; return <section key={skill.id} className={`rounded-[22px] border p-5 ${tone}`}><div className="flex items-start justify-between gap-3"><div className="grid size-9 place-items-center rounded-xl bg-white/70"><Target className="size-4" /></div><span className="font-display text-3xl font-semibold">{value}%</span></div><h2 className="mt-5 font-semibold">{skill.label}</h2><p className="mt-1 text-xs text-[var(--muted-ink)]">{row ? `${row.state} · revisão ${new Date(row.nextReviewAt).toLocaleDateString("pt-BR")}` : "Ainda não observada"}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="h-full bg-[var(--navy)]" style={{ width: `${value}%` }} /></div></section>; })}</div>{error && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--orange-deep)]"><AlertTriangle className="size-4" />Histórico temporariamente indisponível.</p>}</>;
}

export function AdaptiveErrorNotebook({ setView }: { setView: (view: View) => void }) {
  const { data, error } = useProgress();
  const rows = data?.errors ?? [];
  const corrective: Record<string, string> = { "erro-de-alta-confianca": "Não Confunda", fundamentacao: "Complete a Fundamentação", "consequencia-pedido": "Fato → tese → pedido", "identificacao-aplicacao": "Caça à Tese", "ajuste-fino": "Reescrita concisa" };
  return <><div className="mb-7"><p className="eyebrow">Caderno de erros</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Erro vira treino corretivo</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">Cada registro liga resposta, confiança, tese, habilidade, causa provável e próxima revisão.</p></div>{rows.length ? <div className="grid gap-4">{rows.map((row) => { const [unitId, rubricId] = row.exerciseId.split(":"); const unit = units.find((item) => item.id === unitId); const rubric = unit?.rubric_items.find((item) => item.id === rubricId); const skill = taxonomy.skills.find((item) => rubric?.skill_ids.includes(item.id) || unit?.skill_ids.includes(item.id)); return <section key={row.id} className="rounded-[24px] border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.category.replaceAll("-", " ")}</Badge>{row.confidence >= 4 && <Badge className="bg-[var(--orange-soft)] text-[var(--orange-deep)]">Erro com alta confiança</Badge>}</div><h2 className="font-display mt-3 text-xl font-semibold">{unit?.title ?? row.thesisId ?? row.exerciseId}</h2><p className="mt-1 text-xs text-[var(--muted-ink)]">{skill?.label ?? "Habilidade em classificação"} · revisão {new Date(row.nextReviewAt).toLocaleDateString("pt-BR")}</p></div><Button onClick={() => setView("train")} variant="outline" className="rounded-xl">{corrective[row.category] ?? "Refazer"}</Button></div><div className="mt-5 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl bg-[var(--mist)] p-4"><p className="eyebrow">Sua resposta</p><p className="mt-2 text-sm leading-6">{row.excerpt}</p></div><div className="rounded-2xl bg-[var(--blue-soft)] p-4"><p className="eyebrow">Resposta ideal</p><p className="mt-2 line-clamp-6 text-sm leading-6">{rubric?.official_text ?? unit?.official_commentary ?? "Será exibida no treino corretivo."}</p></div><div className="rounded-2xl bg-[var(--orange-soft)] p-4"><p className="eyebrow">Causa e ação</p><p className="mt-2 text-sm leading-6"><strong>Causa provável:</strong> {row.category.replaceAll("-", " ")}.</p><p className="mt-2 text-sm"><strong>Corretivo:</strong> {corrective[row.category] ?? "Reescrita guiada"}.</p><p className="mt-2 text-xs text-[var(--orange-deep)]">Confiança declarada: {row.confidence}/5.</p></div></div></section>; })}</div> : <div className="grid min-h-64 place-items-center rounded-[28px] border bg-white p-8 text-center"><div><Check className="mx-auto size-8 text-[var(--blue)]" /><h2 className="font-display mt-4 text-2xl font-semibold">Nenhum erro pendente</h2><p className="mt-2 text-sm text-[var(--muted-ink)]">Respostas abaixo de 80% aparecem aqui automaticamente.</p>{error && <p className="mt-3 text-xs text-[var(--orange-deep)]">O histórico está temporariamente indisponível.</p>}</div></div>}</>;
}
