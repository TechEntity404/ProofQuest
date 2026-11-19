"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessRoute, getProofQuestSession } from "@/lib/proofquest-auth";

const PUBLIC_PATHS = ["/login", "/unauthorized"];

export default function ProofQuestAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (PUBLIC_PATHS.includes(pathname)) {
      setReady(true);
      return;
    }

    const session = getProofQuestSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccessRoute(session.user.role, pathname)) {
      router.replace("/unauthorized");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080B10] px-5 text-sm text-slate-400">
        Checking your PROOFQUEST access…
      </div>
    );
  }
  return <>{children}</>;
}
