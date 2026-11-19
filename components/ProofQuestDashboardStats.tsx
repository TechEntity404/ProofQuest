"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, Inbox, Users } from "lucide-react";

type RecordLike = Record<string, unknown>;
type Metrics = { projects: number; openProjects: number; contributors: number; acceptedDeliverables: number; pendingApplications: number };
const EMPTY: Metrics = { projects: 0, openProjects: 0, contributors: 0, acceptedDeliverables: 0, pendingApplications: 0 };

function readArray(key: string): RecordLike[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is RecordLike => typeof item === "object" && item !== null) : [];
  } catch {
    return [];
  }
}

function calculateMetrics(): Metrics {
  const projects = readArray("proofquest_challenges_v1");
  const members = readArray("proofquest_team_members_v1");
  const submissions = readArray("proofquest_submissions_v1");
  const projectApplications = readArray("proofquest_project_applications_v1");
  const microquestApplications = readArray("proofquest_microquest_applications_v1");
  const contributors = new Set(
    members.map((member) => String(member.studentName ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const pendingApplications = [...projectApplications, ...microquestApplications]
    .filter((application) => application.status === "Pending").length;

  return {
    projects: projects.length,
    openProjects: projects.filter((project) => project.status === "Open").length,
    contributors: contributors.size,
    acceptedDeliverables: submissions.filter((submission) => submission.status === "Accepted").length,
    pendingApplications,
  };
}

/** Drop this component into the homepage dashboard where the old static KPI cards appear. */
export default function ProofQuestDashboardStats() {
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);

  useEffect(() => {
    const refresh = () => setMetrics(calculateMetrics());
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname]);

  const cards = [
    { label: "Challenges", value: metrics.projects, note: `${metrics.openProjects} open opportunities`, icon: BriefcaseBusiness },
    { label: "Contributors", value: metrics.contributors, note: "Accepted student members", icon: Users },
    { label: "Pending applications", value: metrics.pendingApplications, note: "Awaiting project owner review", icon: Inbox },
    { label: "Accepted deliverables", value: metrics.acceptedDeliverables, note: "Reviewed and accepted", icon: CheckCircle2 },
  ];

  return (
    <section aria-label="Live platform metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="border border-[#D8D5CC] bg-[#FBFAF6] p-5">
            <div className="flex items-center gap-2 text-[#A04A32]">
              <Icon size={17} strokeWidth={1.7} />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#686760]">{card.label}</span>
            </div>
            <p className="mt-3 font-serif text-4xl tabular-nums text-[#191918]">{card.value}</p>
            <p className="mt-1 text-xs text-[#77756D]">{card.note}</p>
          </article>
        );
      })}
    </section>
  );
}
