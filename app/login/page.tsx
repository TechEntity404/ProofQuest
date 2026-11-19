"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Users, Building2, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import { DEMO_ACCOUNTS, roleLabel, signInDemo } from "@/lib/proofquest-auth";

const roleIcons = {
  student: Users,
  organization: Building2,
  coordinator: GraduationCap,
  mentor: BookOpen,
  admin: ShieldCheck,
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const session = signInDemo(email, password);
    if (!session) {
      setError("Email or password is incorrect. Use one of the demo accounts below.");
      return;
    }
    router.replace("/");
  };

  const fillAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#080B10] px-4 py-10 text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden lg:block">
          <div className="mb-10 inline-flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-cyan-200"><ShieldCheck size={20}/><span className="text-sm font-semibold tracking-wide">ROLE-BASED ACCESS</span></div>
          <h1 className="text-5xl font-bold tracking-tight">PROOF<span className="text-cyan-400">QUEST</span></h1>
          <p className="mt-4 max-w-lg text-xl leading-8 text-slate-300">Where real challenges meet student innovation.</p>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">Sign in with a demo role to experience different workspaces and permissions across the platform.</p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {["student", "organization", "coordinator", "mentor", "admin"].map((role) => {
              const Icon = roleIcons[role as keyof typeof roleIcons];
              return <div key={role} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-sm text-slate-400"><Icon size={16} className="text-cyan-300"/>{roleLabel(role as keyof typeof roleIcons)}</div>;
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-[#0D121B] p-5 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold">Sign in to PROOFQUEST</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Choose a demo account or enter its credentials manually.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm text-slate-300">Email address<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@demo.proofquest" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"/></label>
            <label className="block text-sm text-slate-300">Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter demo password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"/></label>
            {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-sm text-rose-200">{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">Sign in <ArrowRight size={17}/></button>
          </form>

          <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-white/10"/><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Demo accounts</span><div className="h-px flex-1 bg-white/10"/></div>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = roleIcons[account.role];
              const selected = email === account.email;
              return <button key={account.id} type="button" onClick={() => fillAccount(account)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-cyan-400/40 bg-cyan-400/[0.07]" : "border-white/[0.07] bg-[#080B10] hover:border-white/20"}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Icon size={17}/></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{roleLabel(account.role)}</p><p className="truncate text-xs text-slate-500">{account.hint}</p></div>
                <span className="text-xs text-cyan-300">{selected ? "Selected" : "Use account"}</span>
              </button>;
            })}
          </div>
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-5 text-amber-100/70"><Sparkles size={14} className="mt-0.5 shrink-0"/> Prototype login only. These shared demo credentials and browser-local sessions are not suitable for real accounts or production security.</p>
        </section>
      </div>
    </main>
  );
}
