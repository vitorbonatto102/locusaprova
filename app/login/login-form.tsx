"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (result.data.session) {
      router.replace("/estudar");
      router.refresh();
      return;
    }
    setMessage("Confira seu e-mail para confirmar a conta. Depois, volte para entrar.");
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 py-10">
    <div className="w-full max-w-md rounded-[28px] border bg-white p-7 shadow-sm sm:p-9">
      <p className="eyebrow">Locus · estudo adaptativo</p>
      <h1 className="font-display mt-3 text-3xl font-semibold">{mode === "login" ? "Entre para continuar" : "Crie sua conta"}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Seu plano, treinos e progresso ficam ligados à sua conta.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold">E-mail<input className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[var(--blue)]" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Senha<input className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[var(--blue)]" type="password" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="w-full rounded-xl bg-[var(--navy)] px-4 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={busy}>{busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
      {message && <p role="status" className="mt-4 rounded-xl bg-[var(--mist)] p-3 text-sm">{message}</p>}
      <button className="mt-6 text-sm font-semibold text-[var(--blue)]" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
        {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </div>
  </main>;
}
