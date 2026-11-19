"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { getProofQuestSession, roleLabel, signOutDemo, type ProofQuestUser } from "@/lib/proofquest-auth";

export default function ProofQuestUserMenu() {
  const [user, setUser] = useState<ProofQuestUser | null>(null);
  useEffect(() => {
    const refresh = () => setUser(getProofQuestSession()?.user ?? null);
    refresh();
    window.addEventListener("proofquest-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("proofquest-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!user) return <Link href="/login" className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Sign in</Link>;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="max-w-44 truncate text-sm font-medium text-slate-100">{user.name}</p>
        <p className="text-[11px] text-cyan-300">{roleLabel(user.role)}</p>
      </div>
      <div title={`${user.name} · ${roleLabel(user.role)}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
        <UserRound size={17} />
      </div>
      <button type="button" onClick={() => { signOutDemo(); window.location.assign("/login"); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-rose-400/30 hover:text-rose-200" aria-label="Sign out">
        <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
