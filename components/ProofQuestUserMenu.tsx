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

  if (!user) return <Link href="/login" className="border border-[#191918] bg-[#191918] px-3 py-2 text-sm font-semibold text-white">Sign in</Link>;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="max-w-44 truncate text-sm font-medium text-[#191918]">{user.name}</p>
        <p className="text-[11px] text-[#77756D]">{roleLabel(user.role)}</p>
      </div>
      <div title={`${user.name} · ${roleLabel(user.role)}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CCC7BA] bg-[#EAE7DE] text-[#686760]">
        <UserRound size={17} />
      </div>
      <button type="button" onClick={() => { signOutDemo(); window.location.assign("/login"); }} className="inline-flex items-center gap-2 border border-[#CCC7BA] px-3 py-2 text-xs text-[#686760] transition hover:border-[#A04A32] hover:text-[#A04A32]" aria-label="Sign out">
        <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
