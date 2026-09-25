"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, Check, Clock3, LockKeyhole, Shield, Target, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getStudyTrack, getTracksForPath, studyCatalog, type StudyTrack } from "@/lib/study-track";

export type StudyProfile = {
  name?: string;
  activeTrackId: string;
  goalDate: string | null;
  dailyMinutes: number;
  experienceLevel?: "starting" | "studying" | "advanced";
  onboardingComplete: boolean;
  goal?: { id: string; trackId: string; examDate: string | null; dailyMinutes: number; difficulties: string[] } | null;
};

export function StudyOnboarding({ initialProfile, onClose, onComplete }: { initialProfile: StudyProfile | null; onClose: () => void; onComplete: (profile: StudyProfile, track: StudyTrack) => void }) {
  const initialTrack = getStudyTrack(initialProfile?.activeTrackId);
  const [step, setStep] = useState(0);
  const [familyId, setFamilyId] = useState(initialProfile?.onboardingComplete ? initialTrack?.examFamilyId ?? "" : "");
  const [stageId, setStageId] = useState(initialProfile?.onboardingComplete ? initialTrack?.stageId ?? "" : "");
  const [specializationId, setSpecializationId] = useState(initialProfile?.onboardingComplete ? initialTrack?.specializationId ?? "" : "");
  const [examDate, setExamDate] = useState(initialProfile?.goalDate ?? "");
  const [dailyMinutes, setDailyMinutes] = useState(initialProfile?.dailyMinutes ?? 30);
  const [difficulties, setDifficulties] = useState<string[]>(initialProfile?.goal?.difficulties ?? []);
  const [experienceLevel] = useState<"starting" | "studying" | "advanced">(initialProfile?.experienceLevel ?? "starting");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const family = studyCatalog.families.find((item) => item.id === familyId) ?? null;
  const pathTracks = useMemo(() => familyId && stageId ? getTracksForPath(familyId, stageId) : [], [familyId, stageId]);
  const selectedTrack = useMemo(() => {
    if (!pathTracks.length) return null;
    if (pathTracks.length === 1) return pathTracks[0];
    return pathTracks.find((track) => track.specializationId === specializationId) ?? null;
  }, [pathTracks, specializationId]);

  function chooseFamily(id: string) {
    setFamilyId(id);
    setStageId("");
    setSpecializationId("");
    setDifficulties([]);
  }

  function chooseStage(id: string) {
    setStageId(id);
    setSpecializationId("");
    setDifficulties([]);
  }

  function toggleDifficulty(item: string) {
    setDifficulties((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  }

  function useAvailableTrack() {
    setFamilyId(familyId === "public-exams" ? "public-exams" : "oab");
    setStageId(familyId === "public-exams" ? "police" : "second-phase");
    setSpecializationId(familyId === "public-exams" ? "pf-agent-2025" : "criminal-law");
    setDifficulties([]);
    setStep(2);
  }

  async function save() {
    if (!selectedTrack || selectedTrack.contentStatus !== "complete") return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackId: selectedTrack.id, examDate: examDate || null, dailyMinutes, difficulties, experienceLevel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      window.localStorage.setItem("locus-session-minutes", String(dailyMinutes));
      onComplete(data.profile as StudyProfile, selectedTrack);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step + 1) / 4) * 100;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(10,22,39,.76)] p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Configurar objetivo de estudo"><div className="mx-auto my-3 w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-2xl sm:my-8">
    <div className="border-b px-5 py-5 sm:px-8"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--navy)] text-white"><Target className="size-5" /></span><div><p className="font-display text-xl font-semibold">Seu objetivo no Locus</p><p className="text-xs text-[var(--muted-ink)]">Etapa {step + 1} de 4</p></div></div><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[var(--mist)]" aria-label="Fechar"><X className="size-4" /></button></div><Progress value={progress} className="mt-5 h-1.5" /></div>

    <div className="min-h-[520px] p-5 sm:p-8">
      {step === 0 && <div><Badge className="bg-[var(--acid-soft)] text-[var(--navy)]">O motor começa pela prova</Badge><h1 className="font-display mt-4 text-4xl font-semibold tracking-[-.05em]">O que você está estudando?</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Escolha o objetivo. O conteúdo muda; o motor de domínio, erros e revisão continua o mesmo.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{studyCatalog.families.map((item) => <button key={item.id} onClick={() => chooseFamily(item.id)} className={`rounded-[22px] border p-6 text-left transition ${familyId === item.id ? "border-[var(--blue)] bg-[var(--blue-soft)] ring-2 ring-[var(--blue)]/10" : "hover:bg-[var(--mist)]"}`}><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white"><Target className="size-5 text-[var(--blue)]" /></span>{familyId === item.id && <Check className="size-5 text-[var(--blue)]" />}</div><h2 className="font-display mt-5 text-2xl font-semibold">{item.label}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{item.description}</p></button>)}</div></div>}

      {step === 1 && family && <div><p className="eyebrow">{family.label}</p><h1 className="font-display mt-2 text-4xl font-semibold tracking-[-.05em]">{familyId === "oab" ? "Qual etapa?" : "Qual carreira?"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Os percursos em preparação aparecem para mostrar a arquitetura, mas não podem ser ativados sem conteúdo validado.</p><div className={`mt-7 grid gap-3 ${family.pathways.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>{family.pathways.map((path) => <button key={path.id} onClick={() => chooseStage(path.id)} className={`rounded-2xl border p-4 text-left ${stageId === path.id ? "border-[var(--blue)] bg-[var(--blue-soft)]" : "hover:bg-[var(--mist)]"}`}><p className="font-semibold">{path.id === "police" ? "👮 " : path.id === "courts" ? "⚖️ " : path.id === "tax" ? "💰 " : path.id === "banking" ? "🏦 " : "🏛️ "}{path.label}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{path.description}</p></button>)}</div>
        {familyId === "oab" && stageId === "second-phase" && <div className="mt-7"><p className="eyebrow">Área da 2ª fase</p><div className="mt-3 flex flex-wrap gap-2">{pathTracks.map((track) => <button key={track.id} onClick={() => { setSpecializationId(track.specializationId ?? ""); setDifficulties([]); }} className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${specializationId === track.specializationId ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "bg-white"}`}>{track.specializationLabel}</button>)}</div></div>}
        {familyId === "public-exams" && stageId === "police" && <div className="mt-7"><p className="eyebrow">Qual é seu objetivo?</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pathTracks.map((track) => <button key={track.id} onClick={() => { setSpecializationId(track.specializationId ?? ""); setDifficulties([]); }} className={`rounded-2xl border p-4 text-left ${specializationId === track.specializationId ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "bg-white hover:bg-[var(--mist)]"}`}><span className="flex items-center gap-2 font-semibold"><Shield className="size-4" />{track.specializationLabel}</span><span className={`mt-1 block text-xs ${specializationId === track.specializationId ? "text-white/60" : "text-[var(--muted-ink)]"}`}>{track.contentStatus === "complete" ? "Disponível agora" : "Em preparação"}</span></button>)}</div></div>}
        {selectedTrack && <TrackPreview track={selectedTrack} />}
      </div>}

      {step === 2 && selectedTrack && <div><p className="eyebrow">Rotina e prazo</p><h1 className="font-display mt-2 text-4xl font-semibold tracking-[-.05em]">Quanto cabe na sua vida real?</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Essas respostas ajustam o ponto de partida. O sistema recalibra o plano pelo desempenho observado, não pela sua impressão inicial.</p><div className="mt-8 grid gap-5 sm:grid-cols-2"><label className="rounded-2xl border p-5 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--blue)]" />Quando é sua prova?</span><Input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="mt-3 h-11 rounded-xl" /><span className="mt-2 block text-xs font-normal text-[var(--muted-ink)]">Opcional. Você pode ajustar depois.</span></label><div className="rounded-2xl border p-5"><p className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-[var(--blue)]" />Quanto tempo por dia?</p><div className="mt-3 grid grid-cols-3 gap-2">{[10,20,30,45,60,90].map((minutes) => <button key={minutes} onClick={() => setDailyMinutes(minutes)} className={`rounded-xl px-3 py-3 text-sm font-bold ${dailyMinutes === minutes ? "bg-[var(--navy)] text-white" : "bg-[var(--mist)]"}`}>{minutes} min</button>)}</div></div></div><div className="mt-7"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Sinal inicial</p><h2 className="font-display mt-1 text-2xl font-semibold">Onde você sente mais dificuldade?</h2></div><span className="text-xs text-[var(--muted-ink)]">Opcional · não define seu nível</span></div><div className="mt-4 flex flex-wrap gap-2">{selectedTrack.difficultyOptions.map((item) => <button key={item} onClick={() => toggleDifficulty(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${difficulties.includes(item) ? "border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue)]" : "bg-white"}`}>{difficulties.includes(item) && <Check className="mr-1 inline size-3" />}{item}</button>)}</div><p className="mt-4 rounded-2xl bg-[var(--acid-soft)] p-4 text-sm leading-6"><strong>O sistema vai medir.</strong> Confiança, acertos, erros recorrentes e retenção ao longo do tempo terão mais peso que esta resposta.</p></div></div>}

      {step === 3 && selectedTrack && <div><p className="eyebrow">Resumo do percurso</p><h1 className="font-display mt-2 text-4xl font-semibold tracking-[-.05em]">{selectedTrack.contentStatus === "complete" ? "Pronto para montar seu plano" : "Estrutura pronta; conteúdo ainda não"}</h1><div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]"><section className="rounded-[24px] border p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted-ink)]">Objetivo escolhido</p><h2 className="font-display mt-2 text-3xl font-semibold">{selectedTrack.shortLabel}</h2></div><Badge className={selectedTrack.contentStatus === "complete" ? "bg-[var(--acid-soft)] text-[var(--navy)]" : "bg-[var(--orange-soft)] text-[var(--orange-deep)]"}>{selectedTrack.contentStatus === "complete" ? "Disponível" : "Em preparação"}</Badge></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><SummaryItem label="Prova" value={examDate ? new Date(`${examDate}T12:00:00`).toLocaleDateString("pt-BR") : "Ainda sem data"} /><SummaryItem label="Rotina" value={`${dailyMinutes} min por dia`} /><SummaryItem label="Dificuldades declaradas" value={difficulties.length ? difficulties.join(" · ") : "O sistema irá medir"} /><SummaryItem label="Modo de simulado" value={selectedTrack.simulationMode === "paper-guided" ? "Papel + orientação na tela" : selectedTrack.simulationMode === "objective-screen" ? "Objetivo na tela" : "Híbrido"} /></div></section><aside className={`rounded-[24px] p-6 ${selectedTrack.contentStatus === "complete" ? "bg-[var(--navy)] text-white" : "bg-[var(--orange-soft)]"}`}>{selectedTrack.contentStatus === "complete" ? <><BookOpenCheck className="size-6 text-[var(--acid)]" /><h2 className="font-display mt-4 text-2xl font-semibold">Conteúdo validado</h2><p className="mt-2 text-sm leading-6 text-white/60">O plano será criado a partir das provas oficiais, do seu histórico e das próximas revisões.</p><Button disabled={saving} onClick={save} className="mt-6 h-12 w-full rounded-xl bg-[var(--acid)] font-bold text-[var(--navy)] hover:bg-[#c9f277]">{saving ? "Salvando…" : "Ativar objetivo"}<ArrowRight className="size-4" /></Button></> : <><LockKeyhole className="size-6 text-[var(--orange-deep)]" /><h2 className="font-display mt-4 text-2xl font-semibold">Sem curso vazio</h2><p className="mt-2 text-sm leading-6 text-[var(--orange-deep)]">{selectedTrack.contentNote} Este percurso não será ativado até ter questões e fontes verificadas.</p><Button onClick={useAvailableTrack} className="mt-6 h-12 w-full rounded-xl">Usar Penal disponível</Button></>}{error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}</aside></div></div>}
    </div>

    <div className="flex items-center justify-between border-t px-5 py-4 sm:px-8"><Button disabled={step === 0 || saving} onClick={() => setStep((value) => Math.max(0, value - 1))} variant="ghost"><ArrowLeft className="size-4" />Voltar</Button>{step < 3 && <Button disabled={(step === 0 && !familyId) || (step === 1 && !selectedTrack)} onClick={() => setStep((value) => Math.min(3, value + 1))}>Continuar<ArrowRight className="size-4" /></Button>}</div>
  </div></div>;
}

function TrackPreview({ track }: { track: StudyTrack }) {
  return <section className="mt-7 rounded-[22px] border bg-[var(--mist)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Percurso</p><h2 className="font-display mt-1 text-2xl font-semibold">{track.shortLabel}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{track.contentNote}</p></div><Badge className={track.contentStatus === "complete" ? "bg-[var(--acid-soft)] text-[var(--navy)]" : "bg-white text-[var(--muted-ink)]"}>{track.contentStatus === "complete" ? "Disponível" : "Em preparação"}</Badge></div><div className="mt-5 flex flex-wrap gap-2">{track.capabilities.map((capability) => <span key={capability} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold">{studyCatalog.capabilityLabels[capability] ?? capability}</span>)}</div>{track.subjects.length > 0 && <p className="mt-4 text-xs text-[var(--muted-ink)]">{track.subjects.length} disciplina{track.subjects.length === 1 ? "" : "s"} mapeada{track.subjects.length === 1 ? "" : "s"} na estrutura.</p>}</section>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[var(--mist)] p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted-ink)]">{label}</p><p className="mt-2 text-sm font-semibold leading-5">{value}</p></div>;
}
