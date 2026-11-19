"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import ProofQuestUserMenu from "@/components/ProofQuestUserMenu";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080B10] px-5 text-slate-100">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0D121B] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300"><ShieldAlert size={26}/></div>
        <h1 className="mt-5 text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Your current PROOFQUEST role does not have permission to open this page. Switch to an account with the required role or return to your dashboard.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950"><ArrowLeft size={15}/> Dashboard</Link><ProofQuestUserMenu/></div>
      </section>
    </main>
  );
}
