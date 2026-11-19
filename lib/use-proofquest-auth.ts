"use client";

import { useEffect, useState } from "react";
import { getProofQuestSession, type ProofQuestUser } from "@/lib/proofquest-auth";

export function useProofQuestAuth() {
  const [user, setUser] = useState<ProofQuestUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const refresh = () => {
      setUser(getProofQuestSession()?.user ?? null);
      setLoaded(true);
    };
    refresh();
    window.addEventListener("proofquest-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("proofquest-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { user, loaded };
}
