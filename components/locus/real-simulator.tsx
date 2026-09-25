"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, ExternalLink, FileCheck2, ListChecks, Pause, PenLine, Play, RotateCcw } from "lucide-react";
import unitsData from "@/data/exam-units.json";
import { ActiveReading } from "./active-reading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cleanExamText, rubricForUnit } from "@/lib/corpus.mjs";
import { evaluateSelfAssessment } from "@/lib/simulation.mjs";

type Phase = "setup" | "writing" | "review" | "result";
const TOTAL_SECONDS = 5 * 60 * 60;
const materials = ["Papel ou caderno de prova", "Caneta", "Vade Mecum sem anotações proibidas"];

export function RealSimulator() {
  const exams = useMemo(() => [...new Set(unitsData.map((unit) => unit.exam_number))].sort((a, b) => b - a), []);
  const [examNumber, setExamNumber] = useState(exams[0]);
  const examUnits = useMemo(() => unitsData.filter((unit) => unit.exam_number === examNumber).sort((a, b) => (a.kind === "piece" ? -1 : 1) || (a.question_number ?? 0) - (b.question_number ?? 0)), [examNumber]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [active, setActive] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [checkedMaterials, setCheckedMaterials] = useState<boolean[]>(materials.map(() => false));
  const [completedOnPaper, setCompletedOnPaper] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pieceNames, setPieceNames] = useState<Record<string, string>>({});
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, number[]>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0 || phase !== "writing") return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds, phase]);

  const current = examUnits[active];
  const reviewUnit = examUnits[reviewIndex];
  const time = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const corrections = useMemo(() => examUnits.map((unit) => ({ unit, evaluation: evaluateSelfAssessment(rubricForUnit(unit), checkedCriteria[unit.id] ?? []) })), [examUnits, checkedCriteria]);
  const total = corrections.reduce((sum, item) => sum + item.evaluation.score, 0);
  const possible = corrections.reduce((sum, item) => sum + item.evaluation.maxScore, 0);
  const allMaterialsReady = checkedMaterials.every(Boolean);
  const completedCount = examUnits.filter((unit) => completedOnPaper[unit.id]).length;

  function begin() {
    if (!allMaterialsReady) return;
    setPhase("writing");
    setRunning(true);
  }

  function beginReview() {
    setRunning(false);
    setReviewIndex(0);
    setPhase("review");
  }

  async function finishReview() {
    setSaving(true);
    setPhase("result");
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examNumber, durationSeconds: TOTAL_SECONDS - seconds, answers: notes, selfAssessment: checkedCriteria }),
      });
      setSaved(response.ok);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setPhase("setup");
    setActive(0);
    setReviewIndex(0);
    setCheckedMaterials(materials.map(() => false));
    setCompletedOnPaper({});
    setNotes({});
    setPieceNames({});
    setCheckedCriteria({});
    setRevealed({});
    setSeconds(TOTAL_SECONDS);
    setRunning(false);
    setSaved(false);
    setSaving(false);
  }

  function selectExam(value: number) {
    setExamNumber(value);
    reset();
  }

  function toggleCriterion(unitId: string, index: number, checked: boolean) {
    setCheckedCriteria((value) => {
      const currentIndexes = value[unitId] ?? [];
      return { ...value, [unitId]: checked ? [...new Set([...currentIndexes, index])] : currentIndexes.filter((item) => item !== index) };
    });
  }

  function advanceReview() {
    if (reviewIndex === examUnits.length - 1) void finishReview();
    else setReviewIndex((value) => value + 1);
  }

  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Treino longo</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">A prova acontece no papel</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">Use uma prova oficial, caneta e Vade Mecum. O Locus organiza o tempo e conduz a correção depois — sem substituir a habilidade que será cobrada no dia.</p></div>
      <div className="flex gap-2"><select disabled={phase !== "setup"} value={examNumber} onChange={(event) => selectExam(Number(event.target.value))} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold disabled:opacity-60">{exams.map((exam) => <option key={exam} value={exam}>{exam}º Exame</option>)}</select><Button onClick={reset} variant="outline" className="rounded-xl"><RotateCcw className="size-4" />Reiniciar</Button></div>
    </div>

    {phase === "setup" && <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className="rounded-[28px] border bg-white p-6 sm:p-8">
        <Badge className="border-0 bg-[var(--acid-soft)] text-[var(--navy)]">{examUnits[0]?.exam_label} · prova oficial</Badge>
        <h2 className="font-display mt-5 text-3xl font-semibold tracking-[-.04em]">Uma peça e quatro questões, como na prova real</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Ao começar, o cronômetro de cinco horas será iniciado. Leia os enunciados na tela, consulte somente o material permitido e escreva tudo à mão. O espelho permanece oculto até você encerrar.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">{examUnits.map((unit) => <div key={unit.id} className="rounded-2xl bg-[var(--mist)] p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted-ink)]">{unit.kind === "piece" ? "Peça profissional" : `Questão ${unit.question_number}`}</p><p className="mt-2 text-sm font-semibold">{unit.official_total_score.toFixed(2).replace(".", ",")} pontos</p></div>)}</div>
      </section>
      <aside className="rounded-[28px] bg-[var(--navy)] p-6 text-white sm:p-7"><FileCheck2 className="size-6 text-[var(--acid)]" /><h2 className="font-display mt-4 text-2xl font-semibold">Prepare sua mesa</h2><p className="mt-2 text-sm leading-6 text-white/60">Confirme o material antes de abrir a prova.</p><div className="mt-6 space-y-3">{materials.map((item, index) => <label key={item} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm font-semibold"><Checkbox checked={checkedMaterials[index]} onCheckedChange={(checked) => setCheckedMaterials((value) => value.map((entry, itemIndex) => itemIndex === index ? checked === true : entry))} className="border-white/50 data-[state=checked]:border-[var(--acid)] data-[state=checked]:bg-[var(--acid)] data-[state=checked]:text-[var(--navy)]" />{item}</label>)}</div><Button disabled={!allMaterialsReady} onClick={begin} className="mt-6 h-12 w-full rounded-xl bg-[var(--acid)] font-bold text-[var(--navy)] hover:bg-[#c9f277]">Começar prova <Play className="size-4 fill-current" /></Button></aside>
    </div>}

    {phase === "writing" && current && <>
      <div className="sticky top-[88px] z-[5] mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--navy)] px-5 py-4 text-white shadow-lg"><div className="flex items-center gap-3"><Clock3 className="size-5 text-[var(--acid)]" /><span className="font-mono text-2xl font-bold tracking-wider">{time}</span><Badge className="border-0 bg-white/10 text-white">{completedCount}/5 concluídas no papel</Badge></div><Button onClick={() => setRunning((value) => !value)} className="bg-white text-[var(--navy)] hover:bg-white/90">{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pausar" : "Retomar"}</Button></div>
      <div className="mb-4 flex gap-2 overflow-x-auto">{examUnits.map((unit, index) => <button key={unit.id} onClick={() => setActive(index)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${active === index ? "bg-[var(--navy)] text-white" : "border bg-white"}`}>{completedOnPaper[unit.id] && <Check className="size-3" />}{unit.kind === "piece" ? "Peça profissional" : `Questão ${unit.question_number}`}</button>)}</div>
      <section className="grid gap-5 rounded-[28px] border bg-white p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)] lg:p-7"><div><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">{current.kind === "piece" ? "Peça profissional" : `Questão ${current.question_number}`}</h2><span className="text-xs font-bold text-[var(--muted-ink)]">{current.official_total_score.toFixed(2).replace(".", ",")} pontos</span></div><p className="mt-2 text-xs text-[var(--muted-ink)]">As marcações de leitura ficam só na tela e não revelam o espelho.</p><div className="mt-4"><ActiveReading text={cleanExamText(current.statement)} /></div></div><aside className="flex flex-col rounded-2xl bg-[var(--mist)] p-5"><PenLine className="size-5 text-[var(--blue)]" /><p className="eyebrow mt-4">Faça no papel</p><h3 className="font-display mt-2 text-2xl font-semibold">{current.kind === "piece" ? "Redija a peça completa" : "Responda aos itens A e B"}</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted-ink)]">{(current.kind === "piece" ? ["Identifique a peça e o endereçamento.", "Estruture preliminares, teses e fundamentos.", "Feche com pedidos, data e assinatura."] : ["Separe claramente os itens A e B.", "Aplique o fundamento aos fatos.", "Indique a consequência jurídica."]).map((item) => <li key={item} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--blue)]" />{item}</li>)}</ul><label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 text-sm font-semibold"><Checkbox checked={completedOnPaper[current.id] ?? false} onCheckedChange={(checked) => setCompletedOnPaper((value) => ({ ...value, [current.id]: checked === true }))} />Concluí esta parte no papel</label><a href={current.source.url} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-1 text-xs font-semibold text-[var(--blue)]">Fonte oficial, p. {current.source.page_start}<ExternalLink className="size-3" /></a><div className="mt-auto flex gap-2 pt-6"><Button disabled={active === 0} onClick={() => setActive((value) => value - 1)} variant="outline" className="flex-1"><ArrowLeft className="size-4" />Anterior</Button><Button disabled={active === examUnits.length - 1} onClick={() => setActive((value) => value + 1)} className="flex-1">Próxima<ArrowRight className="size-4" /></Button></div></aside></section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--muted-ink)]">Você pode encerrar mesmo com partes não marcadas. O espelho será revelado uma etapa por vez.</p><Button onClick={beginReview} className="h-12 rounded-xl px-7">Encerrar prova e iniciar correção <ListChecks className="size-4" /></Button></div>
    </>}

    {phase === "review" && reviewUnit && <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[24px] bg-[var(--navy)] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[.12em] text-white/50">Correção guiada</p><p className="font-display mt-3 text-3xl font-semibold">{reviewIndex + 1} <span className="text-lg text-white/40">/ 5</span></p><div className="mt-6 space-y-2">{examUnits.map((unit, index) => <button key={unit.id} onClick={() => index <= reviewIndex && setReviewIndex(index)} disabled={index > reviewIndex} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${index === reviewIndex ? "bg-white text-[var(--navy)]" : index < reviewIndex ? "bg-white/10 text-white" : "text-white/30"}`}><span className="grid size-6 place-items-center rounded-full bg-current/10 text-xs">{index < reviewIndex ? <Check className="size-3" /> : index + 1}</span>{unit.kind === "piece" ? "Peça" : `Questão ${unit.question_number}`}</button>)}</div><p className="mt-6 text-xs leading-5 text-white/50">Primeiro registre o que fez de memória. Só depois confira o espelho.</p></aside>
      <section className="rounded-[28px] border bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{reviewUnit.kind === "piece" ? "Peça profissional" : `Questão ${reviewUnit.question_number}`}</p><h2 className="font-display mt-2 text-3xl font-semibold">{revealed[reviewUnit.id] ? reviewUnit.title : "O que você colocou no papel?"}</h2></div><Badge variant="outline">{reviewUnit.official_total_score.toFixed(2).replace(".", ",")} pontos</Badge></div>
        {!revealed[reviewUnit.id] ? <div className="mt-7 max-w-3xl">{reviewUnit.kind === "piece" && <label className="text-sm font-semibold">Qual peça você escolheu?<Input value={pieceNames[reviewUnit.id] ?? ""} onChange={(event) => setPieceNames((value) => ({ ...value, [reviewUnit.id]: event.target.value }))} placeholder="Ex.: Alegações finais por memoriais" className="mt-2 h-11 rounded-xl" /></label>}<label className={`block text-sm font-semibold ${reviewUnit.kind === "piece" ? "mt-5" : ""}`}>{reviewUnit.kind === "piece" ? "Resuma o endereçamento, as teses e os pedidos" : "Resuma sua resposta aos itens A e B"}<Textarea value={notes[reviewUnit.id] ?? ""} onChange={(event) => setNotes((value) => ({ ...value, [reviewUnit.id]: event.target.value }))} placeholder="Registre de memória antes de olhar o padrão de resposta…" className="mt-2 min-h-40 rounded-2xl" /></label><div className="mt-5 flex flex-wrap gap-3"><Button disabled={!notes[reviewUnit.id]?.trim() && !pieceNames[reviewUnit.id]?.trim()} onClick={() => setRevealed((value) => ({ ...value, [reviewUnit.id]: true }))}>Revelar espelho desta etapa <FileCheck2 className="size-4" /></Button><Button variant="outline" onClick={() => { setNotes((value) => ({ ...value, [reviewUnit.id]: "Deixei esta parte em branco." })); setRevealed((value) => ({ ...value, [reviewUnit.id]: true })); }}>Deixei em branco</Button></div></div> : <div className="mt-7"><div className="rounded-2xl bg-[var(--blue-soft)] p-5"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--blue)]">Seu registro antes do espelho</p>{reviewUnit.kind === "piece" && <p className="mt-2 text-sm"><strong>Peça escolhida:</strong> {pieceNames[reviewUnit.id] || "Não informada"}</p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6">{notes[reviewUnit.id] || "Em branco"}</p></div><div className="mt-7"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Espelho oficial</p><h3 className="font-display mt-1 text-2xl font-semibold">Marque apenas o que realmente escreveu</h3></div><p className="text-sm font-semibold">{corrections[reviewIndex]?.evaluation.score.toFixed(2)} / {corrections[reviewIndex]?.evaluation.maxScore.toFixed(2)}</p></div><div className="mt-4 space-y-2">{rubricForUnit(reviewUnit).map((criterion: { criterion: string; points: number }, index: number) => <label key={`${criterion.criterion}-${index}`} className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4"><Checkbox checked={(checkedCriteria[reviewUnit.id] ?? []).includes(index)} onCheckedChange={(checked) => toggleCriterion(reviewUnit.id, index, checked === true)} className="mt-0.5" /><span className="min-w-0 flex-1 text-sm font-medium leading-6">{criterion.criterion}</span><span className="shrink-0 text-xs font-bold">{criterion.points.toFixed(2).replace(".", ",")}</span></label>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><a href={reviewUnit.source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[var(--blue)]">Abrir padrão oficial<ExternalLink className="size-3" /></a><Button disabled={saving} onClick={advanceReview}>{reviewIndex === examUnits.length - 1 ? "Finalizar autoavaliação" : "Salvar e corrigir próxima"}<ArrowRight className="size-4" /></Button></div></div></div>}
      </section>
    </div>}

    {phase === "result" && <div className="space-y-5"><section className="rounded-[28px] bg-[var(--navy)] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.12em] text-white/50">Autoavaliação concluída</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-5xl font-semibold">{total.toFixed(2)} <span className="text-2xl text-white/50">/ {possible.toFixed(2)}</span></p><p className="mt-2 text-sm text-white/60">{saving ? "Salvando o treino no histórico…" : saved ? "Treino salvo no seu histórico." : "Resultado calculado; o histórico não pôde ser salvo agora."}</p></div><p className="max-w-lg text-sm leading-6 text-white/60">A nota reflete os critérios que você confirmou no papel. Caligrafia, clareza, coerência e aderência fina ainda exigem revisão humana.</p></div></section>{corrections.map(({ unit, evaluation }) => <section key={unit.id} className="rounded-[24px] border bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{unit.kind === "piece" ? "Peça profissional" : `Questão ${unit.question_number}`}</p><h2 className="font-display mt-1 text-2xl font-semibold">{unit.title}</h2></div><p className="font-display text-2xl font-semibold">{evaluation.score.toFixed(2)} / {evaluation.maxScore.toFixed(2)}</p></div><div className="mt-5 grid gap-2">{evaluation.criteria.map((criterion) => <div key={criterion.criterion} className="flex items-start gap-3 rounded-2xl border p-4"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${criterion.met ? "bg-[var(--acid)]" : "bg-[var(--mist)] text-[var(--muted-ink)]"}`}>{criterion.met && <Check className="size-3" />}</span><p className="min-w-0 flex-1 text-sm font-semibold leading-6">{criterion.criterion}</p><span className="text-xs font-bold">{criterion.earned.toFixed(2)}/{criterion.possible.toFixed(2)}</span></div>)}</div></section>)}</div>}
  </>;
}
