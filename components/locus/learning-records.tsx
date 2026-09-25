"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Target } from "lucide-react";
import taxonomy from "@/data/taxonomy.json";
import units from "@/data/exam-units.json";
import exercises from "@/data/exercises.json";
import confusionPairs from "@/data/confusion-pairs.json";
import adaptiveDrills from "@/data/oab-penal/adaptive-drills.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveTrainingItem } from "@/lib/corpus.mjs";

type View = "today" | "train" | "mastery" | "radar" | "errors" | "library" | "simulator";
type ProgressData = {
  mastery: { skillId: string; mastery: number; state: string; nextReviewAt: string }[];
  errors: { id: string; exerciseId: string; thesisId?: string | null; category: string; confidence: number; excerpt: string; resolved: boolean; nextReviewAt: string; createdAt: string }[];
  average: number;
};

function useProgress() {
  const [data, setData] = useState<ProgressData | null>(null), [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { fetch("/api/progress", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((value) => { setData(value); setError(false); }).catch(() => setError(true)); }, [revision]);
  return { data, error, reload: () => setRevision((value) => value + 1) };
}

export function SkillMasteryMap() {
  const { data, error } = useProgress();
  const bySkill = new Map((data?.mastery ?? []).map((item) => [item.skillId, item]));
  return <><div className="mb-7"><p className="eyebrow">Mapa de domínio</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Domínio por habilidade</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">A unidade de domínio é a operação que você executa — identificar peça, aplicar regra, formular pedido — e não o exercício isolado.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{taxonomy.skills.map((skill) => { const row = bySkill.get(skill.id); const value = Math.round((row?.mastery ?? 0) * 100); const tone = value >= 80 ? "bg-emerald-100" : value >= 55 ? "bg-amber-100" : value > 0 ? "bg-rose-100" : "bg-[var(--mist)]"; return <section key={skill.id} className={`rounded-[22px] border p-5 ${tone}`}><div className="flex items-start justify-between gap-3"><div className="grid size-9 place-items-center rounded-xl bg-white/70"><Target className="size-4" /></div><span className="font-display text-3xl font-semibold">{value}%</span></div><h2 className="mt-5 font-semibold">{skill.label}</h2><p className="mt-1 text-xs text-[var(--muted-ink)]">{row ? `${row.state} · revisão ${new Date(row.nextReviewAt).toLocaleDateString("pt-BR")}` : "Ainda não observada"}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="h-full bg-[var(--navy)]" style={{ width: `${value}%` }} /></div></section>; })}</div>{error && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--orange-deep)]"><AlertTriangle className="size-4" />Histórico temporariamente indisponível.</p>}</>;
}

export function AdaptiveErrorNotebook({ setView }: { setView: (view: View) => void }) {
  const { data, error, reload } = useProgress();
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ratio: number; criteria: { criterion: string; met: boolean }[] } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const pending = (data?.errors ?? []).filter((row) => !row.resolved);
  const grouped = new Map<string, typeof pending>();
  for (const row of pending) grouped.set(row.exerciseId, [...(grouped.get(row.exerciseId) ?? []), row]);
  const completedCount = (data?.errors ?? []).filter((row) => row.resolved).length;

  async function correct(exerciseId: string) {
    if (!answer.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseId, answer, confidence: 3 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível corrigir.");
      setResult(payload.evaluation);
      reload();
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : "Não foi possível corrigir."); }
    finally { setSubmitting(false); }
  }

  return <>
    <div className="mb-7"><p className="eyebrow">Caderno de erros</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">O que precisa de outra tentativa</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">Aqui ficam as respostas abaixo de 80%. Abra um caso, compare com a referência e reescreva sua resposta. Ao atingir 80%, a pendência é encerrada; o histórico permanece salvo.</p><p className="mt-2 text-sm text-[var(--muted-ink)]">{grouped.size} caso{grouped.size === 1 ? "" : "s"} pendente{grouped.size === 1 ? "" : "s"} · {completedCount} registro{completedCount === 1 ? "" : "s"} superado{completedCount === 1 ? "" : "s"}</p></div>
    {grouped.size ? <div className="grid gap-4">{[...grouped.entries()].map(([exerciseId, rows]) => {
      const row = rows[0];
      const activity = resolveTrainingItem(exerciseId, units, confusionPairs, exercises, adaptiveDrills);
      const skill = taxonomy.skills.find((item) => activity?.skillIds?.includes(item.id));
      const open = selected === exerciseId;
      return <section key={exerciseId} className="rounded-[24px] border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{rows.length} tentativa{rows.length === 1 ? "" : "s"} abaixo de 80%</Badge>{rows.some((item) => item.confidence >= 4) && <Badge className="bg-[var(--orange-soft)] text-[var(--orange-deep)]">Erro com alta confiança</Badge>}</div><h2 className="font-display mt-3 text-xl font-semibold">{activity?.title ?? row.thesisId?.replaceAll("-", " ") ?? "Caso anterior"}</h2><p className="mt-1 text-xs text-[var(--muted-ink)]">{skill?.label ?? "Prática de tese e fundamentação"} · última tentativa em {new Date(row.createdAt).toLocaleDateString("pt-BR")}</p></div><Button onClick={() => { setSelected(open ? null : exerciseId); setAnswer(""); setResult(null); setSubmitError(""); }} variant="outline" className="rounded-xl">{open ? "Fechar" : "Rever e corrigir"}</Button></div>
        {open && <div className="mt-5 space-y-4"><div className="rounded-2xl bg-[var(--mist)] p-4"><p className="text-xs font-semibold text-[var(--muted-ink)]">O caso</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{activity?.prompt ?? "O enunciado original não está mais disponível nesta versão. Consulte sua resposta anterior abaixo."}</p>{activity?.question && <p className="mt-3 font-semibold">{activity.question}</p>}</div><div className="grid gap-3 lg:grid-cols-2"><div className="rounded-2xl border p-4"><p className="text-xs font-semibold text-[var(--muted-ink)]">Sua última resposta</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{row.excerpt}</p></div><div className="rounded-2xl bg-[var(--blue-soft)] p-4"><p className="text-xs font-semibold text-[var(--muted-ink)]">Resposta de referência</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{activity?.answer ?? "A referência desta atividade não está disponível; ela não pode ser corrigida automaticamente."}</p></div></div>{activity && <><label htmlFor={`correction-${exerciseId}`} className="block text-sm font-semibold">Agora escreva uma nova resposta, aplicando a tese aos fatos</label><Textarea id={`correction-${exerciseId}`} value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-36 rounded-2xl" placeholder="Tese, fato decisivo, fundamento e consequência…" /><Button onClick={() => void correct(exerciseId)} disabled={!answer.trim() || submitting} className="rounded-xl">{submitting ? "Corrigindo…" : "Corrigir esta resposta"}</Button>{result && <div className="rounded-2xl border p-4 text-sm"><p className="font-semibold">{Math.round(result.ratio * 100)}% · {result.ratio >= 0.8 ? "Pendência superada" : "Continue praticando este caso"}</p><p className="mt-2 text-[var(--muted-ink)]">{result.criteria.filter((criterion) => !criterion.met).map((criterion) => criterion.criterion).join(" · ") || "Critérios atendidos."}</p></div>}{submitError && <p role="alert" className="text-sm text-[var(--orange-deep)]">{submitError}</p>}</>}</div>}
      </section>;
    })}</div> : <div className="grid min-h-64 place-items-center rounded-[28px] border bg-white p-8 text-center"><div><Check className="mx-auto size-8 text-[var(--blue)]" /><h2 className="font-display mt-4 text-2xl font-semibold">Nenhum erro pendente</h2><p className="mt-2 text-sm text-[var(--muted-ink)]">Respostas abaixo de 80% aparecem aqui automaticamente.</p><Button onClick={() => setView("train")} variant="outline" className="mt-5 rounded-xl">Abrir treino diário</Button>{error && <p className="mt-3 text-xs text-[var(--orange-deep)]">O histórico está temporariamente indisponível.</p>}</div></div>}
  </>;
}
