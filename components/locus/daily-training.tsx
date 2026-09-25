"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock3, Lightbulb, Play, ShieldCheck, Trophy, X } from "lucide-react";
import { ActiveReading } from "./active-reading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { evaluateRubric } from "@/lib/learning.mjs";

type View = "today" | "train" | "mastery" | "radar" | "errors" | "library" | "simulator";
type Activity = {
  id: string; unitId: string | null; examLabel: string; title: string; kind: string; prompt: string; question: string; answer: string;
  rubric: { criterion: string; points: number; required_terms: string[]; scoring: string }[];
  estimatedMinutes: number; source: { url?: string | null; page_start?: number | null; publisher: string }; validationStatus: string;
  options?: string[] | null; hints?: string[] | null;
};
type Plan = { date: string; estimatedMinutes: number; activityCount: number; activities: Activity[]; groups: { name: string; count: number; minutes: number }[]; rationale: string };
type Feedback = ReturnType<typeof evaluateRubric> & { category?: string; nextReviewAt?: string; persisted?: boolean; pointsLeft?: number; correctiveActivity?: string };
type TrainingSession = {
  id: string; planDate: string; requestedMinutes: number; activityIds: string[]; activities: Activity[]; currentIndex: number;
  draftAnswer: string; confidence: number; phase: "answering" | "feedback"; feedback: Feedback | null; status: "active" | "completed";
};

function useDailyPlan(minutes = 30) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState(false);
  async function load() {
    try {
      const response = await fetch(`/api/daily-plan?minutes=${minutes}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setPlan(await response.json());
      setError(false);
    } catch { setError(true); }
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/daily-plan?minutes=${minutes}`, { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((value) => { if (active) { setPlan(value); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [minutes]);
  return { plan, error, reload: load };
}

export function DailyDashboard({ setView, minutes = 30 }: { setView: (view: View) => void; minutes?: number }) {
  const { plan, error } = useDailyPlan(minutes);
  const [average, setAverage] = useState(0);
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  useEffect(() => { fetch("/api/progress", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => setAverage(Math.round((data?.average ?? 0) * 100))).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/training-session", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => setActiveSession(data?.session ?? null)).catch(() => {}); }, []);
  const start = (minutes: number) => { window.localStorage.setItem("locus-session-minutes", String(minutes)); setView("train"); };
  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Plano adaptado hoje</p><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">O que treinar hoje</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">A agenda é recalculada pelo domínio, esquecimento e erros. Amanhã haverá um novo plano; estas não são atividades únicas nem fixas.</p></div><Button onClick={() => start(10)} variant="outline" className="rounded-xl bg-white">Tenho 10 minutos</Button></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
      <section className="focus-card rounded-[28px] bg-[var(--navy)] p-6 text-white shadow-[0_18px_60px_rgba(15,32,57,.18)] sm:p-8"><div className="flex min-h-[350px] flex-col">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-white/70"><Clock3 className="size-4" />Revisão de hoje · {plan?.estimatedMinutes ?? "—"} min</div><Badge className="border-0 bg-white/10 text-white">{plan?.activityCount ?? "—"} atividades</Badge></div>
        <div className="mt-8 grid flex-1 gap-3 sm:grid-cols-2">{plan?.groups.map((group, index) => <div key={group.name} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4"><span className="grid size-9 place-items-center rounded-xl bg-white/10 font-display text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="font-semibold">{group.name}</p><p className="mt-1 text-xs text-white/55">{group.count} atividade{group.count === 1 ? "" : "s"}</p></div><span className="text-xs font-semibold text-white/50">{group.minutes} min</span></div>)}</div>
        {error && <p className="mt-4 flex items-center gap-2 text-sm text-amber-200"><AlertTriangle className="size-4" />Não foi possível carregar a agenda agora.</p>}
        <div className="mt-7 flex flex-wrap items-center gap-4"><Button onClick={() => start(activeSession?.requestedMinutes ?? minutes)} disabled={!plan && !activeSession} className="h-12 rounded-xl bg-[var(--acid)] px-6 font-bold text-[var(--navy)] hover:bg-[#c9f277]"><Play className="mr-1 size-4 fill-current" />{activeSession ? `Continuar treino · ${activeSession.currentIndex + 1}/${activeSession.activities.length}` : "Começar treino"}</Button><p className="text-xs text-white/50">{activeSession ? "Seu rascunho e o ponto da sessão estão salvos." : plan?.rationale ?? "Calculando prioridade…"}</p></div>
      </div></section>
      <section className="rounded-[28px] border bg-white p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="eyebrow">Domínio observado</p><p className="font-display mt-2 text-5xl font-semibold tracking-[-0.06em]">{average}<span className="text-2xl text-[var(--muted-ink)]">%</span></p></div><div className="grid size-11 place-items-center rounded-2xl bg-[var(--acid-soft)]"><Trophy className="size-5" /></div></div><p className="mt-5 text-sm leading-6 text-[var(--muted-ink)]">Começa em zero e muda apenas com tentativas persistidas. Recorrência histórica tem peso secundário.</p><div className="mt-6 rounded-2xl bg-[var(--mist)] p-4"><p className="eyebrow">Como funciona amanhã</p><p className="mt-2 font-semibold">Itens dominados recuam; itens vencidos e erros confiantes sobem.</p><p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">A rotação diária evita repetir sempre a mesma habilidade.</p></div></section>
    </div>
  </>;
}

export function AdaptiveTraining({ setView }: { setView: (view: View) => void }) {
  const [minutes] = useState(() => typeof window === "undefined" ? 30 : Math.max(10, Math.min(60, Number(window.localStorage.getItem("locus-session-minutes")) || 30)));
  const { plan, error } = useDailyPlan(minutes);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [sessionState, setSessionState] = useState<"loading" | "missing" | "ready" | "unavailable">("loading");
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState(""), [confidence, setConfidence] = useState(3);
  const [feedback, setFeedback] = useState<Feedback | null>(null), [saving, setSaving] = useState(false);
  const [hint, setHint] = useState(0);
  const [progressStatus, setProgressStatus] = useState<"saved" | "saving" | "error">("saved");
  const [completed, setCompleted] = useState(false);
  const started = useRef(0);
  const creating = useRef(false);
  const latestProgress = useRef<{ sessionId: string | null; currentIndex: number; draftAnswer: string; confidence: number; phase: "answering" | "feedback"; feedback: Feedback | null }>({ sessionId: null, currentIndex: 0, draftAnswer: "", confidence: 3, phase: "answering", feedback: null });

  function hydrate(value: TrainingSession) {
    if (!value.activities.length) { setSessionState("unavailable"); return; }
    setSession(value);
    setIndex(value.currentIndex);
    setAnswer(value.draftAnswer ?? "");
    setConfidence(value.confidence ?? 3);
    setFeedback(value.phase === "feedback" ? value.feedback : null);
    setHint(0);
    setSessionState("ready");
    started.current = Date.now();
  }

  useEffect(() => {
    let active = true;
    fetch("/api/training-session", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (!active) return; if (data.session) hydrate(data.session); else setSessionState("missing"); })
      .catch(() => { if (active) setSessionState("unavailable"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sessionState !== "missing" || !plan || creating.current) return;
    creating.current = true;
    fetch("/api/training-session", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "start", planDate: plan.date, requestedMinutes: minutes, activityIds: plan.activities.map((item) => item.id) }),
    }).then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => hydrate(data.session))
      .catch(() => setSessionState("unavailable"));
  }, [minutes, plan, sessionState]);

  const activities = sessionState === "ready" && session ? session.activities : sessionState === "unavailable" ? plan?.activities ?? [] : [];
  const activity = activities[index];

  const persistProgress = useCallback(async (nextFeedback: Feedback | null, nextIndex = index, nextAnswer = answer, nextConfidence = confidence, keepalive = false, navigateToIndex?: number) => {
    if (!session) return null;
    if (!keepalive) setProgressStatus("saving");
    try {
      const response = await fetch("/api/training-session", {
        method: "POST", headers: { "content-type": "application/json" }, keepalive,
        body: JSON.stringify({ action: "progress", sessionId: session.id, currentIndex: nextIndex, draftAnswer: nextAnswer, confidence: nextConfidence, phase: nextFeedback ? "feedback" : "answering", feedback: nextFeedback, navigateToIndex }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!keepalive) setProgressStatus("saved");
      return data.session as TrainingSession;
    } catch {
      if (!keepalive) setProgressStatus("error");
      return null;
    }
  }, [answer, confidence, index, session]);

  useEffect(() => {
    latestProgress.current = { sessionId: session?.id ?? null, currentIndex: index, draftAnswer: answer, confidence, phase: feedback ? "feedback" : "answering", feedback };
    if (!session || sessionState !== "ready" || completed) return;
    const timer = window.setTimeout(() => { void persistProgress(feedback); }, 650);
    return () => window.clearTimeout(timer);
  }, [answer, completed, confidence, feedback, index, persistProgress, session, sessionState]);

  useEffect(() => () => {
    const snapshot = latestProgress.current;
    if (!snapshot.sessionId) return;
    void fetch("/api/training-session", {
      method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ action: "progress", sessionId: snapshot.sessionId, currentIndex: snapshot.currentIndex, draftAnswer: snapshot.draftAnswer, confidence: snapshot.confidence, phase: snapshot.phase, feedback: snapshot.feedback }),
    });
  }, []);

  async function submit() {
    if (!activity || !answer.trim()) return;
    setSaving(true);
    const local = evaluateRubric(answer, activity.rubric, activity.answer);
    let nextFeedback: Feedback;
    try {
      const response = await fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseId: activity.id, answer, confidence, durationSeconds: Math.round((Date.now() - started.current) / 1000) }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      nextFeedback = { ...data.evaluation, category: data.category, nextReviewAt: data.schedule.nextReviewAt, pointsLeft: data.pointsLeft, correctiveActivity: data.correctiveActivity, persisted: true };
    } catch { nextFeedback = { ...local, pointsLeft: Math.max(0, local.maxScore - local.score), persisted: false }; }
    setFeedback(nextFeedback);
    await persistProgress(nextFeedback);
    setSaving(false);
  }
  async function next() {
    const nextIndex = index + 1;
    if (nextIndex >= activities.length) {
      if (session) {
        try {
          const response = await fetch("/api/training-session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "complete", sessionId: session.id }) });
          if (!response.ok) throw new Error();
        } catch { setProgressStatus("error"); return; }
      }
      setCompleted(true);
      return;
    }
    await navigate(nextIndex);
  }
  async function navigate(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= activities.length || targetIndex === index) return;
    if (session) {
      const updated = await persistProgress(feedback, index, answer, confidence, false, targetIndex);
      if (!updated) return;
      hydrate(updated);
      return;
    }
    setIndex(targetIndex);
    setAnswer("");
    setConfidence(3);
    setFeedback(null);
    setHint(0);
    started.current = Date.now();
  }
  if (completed) return <div className="grid min-h-[420px] place-items-center rounded-[28px] border bg-white p-8 text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--acid-soft)]"><Trophy className="size-7" /></div><p className="eyebrow mt-5">Sessão concluída</p><h1 className="font-display mt-2 text-3xl font-semibold">Treino de hoje finalizado</h1><p className="mt-3 text-sm text-[var(--muted-ink)]">As respostas já recalibraram suas próximas revisões.</p><Button onClick={() => setView("today")} className="mt-6 rounded-xl">Voltar para hoje</Button></div></div>;
  if (!activity) return <div className="grid min-h-[420px] place-items-center rounded-[28px] border bg-white p-8 text-center"><div>{error || sessionState === "unavailable" && !plan ? <AlertTriangle className="mx-auto size-8 text-[var(--orange-deep)]" /> : <Clock3 className="mx-auto size-8 animate-pulse text-[var(--blue)]" />}<h1 className="font-display mt-4 text-2xl font-semibold">{error || sessionState === "unavailable" && !plan ? "Agenda indisponível" : sessionState === "loading" ? "Recuperando seu treino" : "Montando sua sessão"}</h1><p className="mt-2 text-sm text-[var(--muted-ink)]">{error || sessionState === "unavailable" && !plan ? "Tente novamente em instantes." : "Seu ponto, rascunho e correção serão retomados automaticamente."}</p></div></div>;
  return <>
    <div className="mb-7"><div className="flex flex-wrap items-center gap-3"><p className="eyebrow">Sessão adaptativa · {index + 1}/{activities.length}</p>{sessionState === "ready" && <span className={`text-xs font-semibold ${progressStatus === "error" ? "text-[var(--orange-deep)]" : "text-[var(--muted-ink)]"}`}>{progressStatus === "saving" ? "Salvando…" : progressStatus === "error" ? "Não foi possível salvar agora" : "Progresso salvo"}</span>}</div><h1 className="font-display mt-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.055em]">{activity.kind === "not_confuse" ? "Não Confunda" : activity.title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-ink)]">Recupere da memória. Você pode sair e continuar deste mesmo ponto depois.</p></div>
    <div className="mb-5 flex flex-wrap items-center gap-2"><Button onClick={() => navigate(index - 1)} disabled={index === 0 || progressStatus === "saving"} variant="outline" className="rounded-xl"><ArrowLeft className="size-4" />Anterior</Button><div className="flex flex-wrap gap-1.5" aria-label="Navegação das atividades">{activities.map((item, position) => <button key={item.id} onClick={() => navigate(position)} aria-label={`Ir para atividade ${position + 1}`} aria-current={position === index ? "step" : undefined} className={`grid size-8 place-items-center rounded-lg text-xs font-bold ${position === index ? "bg-[var(--navy)] text-white" : "border bg-white text-[var(--muted-ink)] hover:bg-[var(--mist)]"}`}>{position + 1}</button>)}</div></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-[28px] border bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="outline">{activity.examLabel}</Badge><span className="text-xs font-semibold text-[var(--muted-ink)]">Microcaso criado para treino · não é questão de prova</span></div><div className="mt-6"><ActiveReading text={activity.prompt} compact /></div><h2 className="font-display mt-5 text-2xl font-semibold tracking-[-0.03em]">{activity.question}</h2>{activity.options?.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{activity.options.map((option) => <button key={option} onClick={() => { setAnswer(option); setFeedback(null); }} className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${answer === option ? "border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue)]" : "hover:bg-[var(--mist)]"}`}>{option}</button>)}</div> : <Textarea value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null); }} placeholder="Estruture: tese → fato decisivo → fundamento → consequência/pedido" className="mt-6 min-h-44 resize-y rounded-2xl" />}{activity.hints?.length && hint > 0 ? <div className="mt-4 rounded-2xl bg-[var(--acid-soft)] p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4" />Pista {hint}</p><p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{activity.hints[hint - 1]}</p></div> : null}<div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={submit} disabled={!answer.trim() || saving || Boolean(feedback)} className="h-11 rounded-xl px-6">{saving ? "Corrigindo…" : feedback ? "Resposta corrigida" : "Corrigir pela rubrica"}</Button>{activity.hints?.length && hint < activity.hints.length ? <Button onClick={() => setHint((value) => value + 1)} variant="outline" className="h-11 rounded-xl"><Lightbulb className="size-4" />Usar pista</Button> : null}</div>{feedback && <TrainingFeedback feedback={feedback} activity={activity} onNext={next} last={index === activities.length - 1} />}</section><aside className="space-y-5"><section className="rounded-[24px] border bg-white p-6"><p className="eyebrow">Antes de corrigir</p><h3 className="font-display mt-2 text-xl font-semibold">Quão confiante está?</h3><div className="mt-5 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <button key={value} onClick={() => setConfidence(value)} className={`grid aspect-square place-items-center rounded-xl text-sm font-bold ${confidence === value ? "bg-[var(--navy)] text-white" : "bg-[var(--mist)]"}`}>{value}</button>)}</div><div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-ink)]"><span>Chute</span><span>Certeza</span></div></section><section className="rounded-[24px] bg-[var(--navy)] p-6 text-white"><ShieldCheck className="size-5 text-[var(--acid)]" /><h3 className="mt-4 font-semibold">Confiança calibra revisão</h3><p className="mt-2 text-sm leading-6 text-white/60">Ela não altera a nota. Erro com certeza alta volta antes e pode gerar um “Não Confunda”.</p></section></aside></div>
  </>;
}

function TrainingFeedback({ feedback, activity, onNext, last }: { feedback: Feedback; activity: Activity; onNext: () => void; last: boolean }) {
  const pct = Math.round(feedback.ratio * 100);
  return <div className="mt-7 border-t pt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Correção por componentes</p><h3 className="font-display mt-1 text-2xl font-semibold">{feedback.usedReferenceAnswer ? "Resposta de referência reconhecida" : pct >= 80 ? "Boa construção" : pct >= 45 ? "Base incompleta" : "Refaça com a rubrica"}</h3></div><div className={`grid size-16 place-items-center rounded-full text-lg font-bold ${pct >= 80 ? "bg-[var(--acid-soft)]" : "bg-[var(--orange-soft)] text-[var(--orange-deep)]"}`}>{pct}%</div></div><div className="mt-5 grid gap-2">{feedback.criteria.map((item) => <div key={item.criterion} className="flex items-center gap-3 rounded-xl bg-[var(--mist)] px-4 py-3"><span className={`grid size-6 place-items-center rounded-full ${item.met ? "bg-[var(--acid)]" : "bg-white text-[var(--orange-deep)]"}`}>{item.met ? <Check className="size-3" /> : <X className="size-3" />}</span><span className="flex-1 text-sm font-medium">{item.criterion}</span><span className="text-xs font-bold">{item.earned}/{item.possible}</span></div>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--blue)]/20 bg-[var(--blue-soft)] p-5"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--blue)]">Resposta de referência</p><p className="mt-2 text-sm leading-6">{activity.answer}</p></div><div className="rounded-2xl border p-5"><p className="eyebrow">Pontos deixados</p><p className="font-display mt-2 text-3xl font-semibold">{(feedback.pointsLeft ?? 0).toFixed(2)}</p>{feedback.correctiveActivity && <p className="mt-2 text-sm text-[var(--muted-ink)]">Corretivo sugerido: <strong>{feedback.correctiveActivity}</strong></p>}<p className="mt-2 text-xs text-[var(--muted-ink)]">Formulações equivalentes são aceitas; resposta de referência sempre vale integralmente.</p></div></div>{!feedback.persisted && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--orange-deep)]"><AlertTriangle className="size-3" />Correção local concluída; histórico não persistido.</p>}<div className="mt-5 flex justify-end"><Button onClick={onNext} className="rounded-xl">{last ? "Concluir treino" : "Próxima atividade"} <ArrowRight className="size-4" /></Button></div></div>;
}
