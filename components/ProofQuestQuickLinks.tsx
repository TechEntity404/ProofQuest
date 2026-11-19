"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity, BriefcaseBusiness, Building2, CheckCircle2, ClipboardCheck,
  GraduationCap, Inbox, Layers3, ShieldCheck, Users, Zap,
} from "lucide-react";
import { getProofQuestSession, type ProofQuestRole } from "@/lib/proofquest-auth";

const links = [
  { href: "/", label: "Dashboard", icon: Zap, group: "Overview", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { href: "/challenges", label: "Challenge Hub", icon: BriefcaseBusiness, group: "Discover", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { href: "/microquests", label: "MicroQuests", icon: Layers3, group: "Discover", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { href: "/organizations", label: "Organizations", icon: Building2, group: "Discover", roles: ["student", "organization", "coordinator", "admin"] },
  { href: "/approvals", label: "University Approvals", icon: GraduationCap, group: "Manage", roles: ["coordinator", "admin"] },
  { href: "/applications", label: "Applications", icon: Inbox, group: "Manage", roles: ["student", "organization", "coordinator", "admin"] },
  { href: "/my-teams", label: "My Teams", icon: Users, group: "Manage", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { href: "/reviews", label: "Reviews", icon: ClipboardCheck, group: "Manage", roles: ["organization", "mentor", "coordinator", "admin"] },
  { href: "/impact", label: "Impact Dashboard", icon: CheckCircle2, group: "Insights", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { href: "/security", label: "Security & Logs", icon: ShieldCheck, group: "Insights", roles: ["coordinator", "admin"] },
] as const;
const groups = ["Overview", "Discover", "Manage", "Insights"];

export default function ProofQuestQuickLinks() {
  const [role, setRole] = useState<ProofQuestRole | null>(null);
  useEffect(() => {
    const refresh = () => setRole(getProofQuestSession()?.user.role ?? null);
    refresh();
    window.addEventListener("proofquest-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("proofquest-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!role) return null;
  return (
    <nav aria-label="PROOFQUEST navigation" className="space-y-5">
      {groups.map((group) => {
        const groupLinks = links.filter((item) => item.group === group && (item.roles as readonly string[]).includes(role));
        if (!groupLinks.length) return null;
        return (
          <section key={group}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group}</p>
            <div className="space-y-1">
              {groupLinks.map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-200"><Icon size={16} className="shrink-0"/><span>{item.label}</span></Link>;
              })}
            </div>
          </section>
        );
      })}
      <p className="flex items-start gap-2 px-3 text-[11px] leading-5 text-slate-600"><Activity size={13} className="mt-0.5 shrink-0"/> Role-filtered demo navigation</p>
    </nav>
  );
}
