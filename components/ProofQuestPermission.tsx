"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getProofQuestSession, hasPermission, type ProofQuestPermission } from "@/lib/proofquest-auth";

export default function ProofQuestPermission({ permission, children, fallback = null }: {
  permission: ProofQuestPermission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const check = () => setAllowed(hasPermission(getProofQuestSession()?.user.role, permission));
    check();
    window.addEventListener("proofquest-auth-change", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("proofquest-auth-change", check);
      window.removeEventListener("storage", check);
    };
  }, [permission]);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
