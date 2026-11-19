"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProofQuestAuth } from "@/lib/use-proofquest-auth";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, ExternalLink, Users, Layers3 } from "lucide-react";

type TeamMember = {
  id: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  studentName: string;
  role: string;
  joinedAt: string;
  joinedVia: "Project" | "MicroQuest";
  microquestIds: string[];
  microquestTitles: string[];
};

const TEAM_MEMBER_KEY = "proofquest_team_members_v1";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyTeamsPage() {
  const { user } = useProofQuestAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEAM_MEMBER_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error("Team data is not a list.");
      setMembers(parsed.filter((item): item is TeamMember =>
        typeof item === "object" && item !== null &&
        typeof (item as TeamMember).projectId === "string" &&
        typeof (item as TeamMember).studentName === "string"
      ));
    } catch (error) {
      console.error("Could not load team membership:", error);
      setWarning("Team membership data could not be read from this browser.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  const scopedMembers = useMemo(() => {
    if (user?.role === "student") return members.filter((member) => member.studentName.trim().toLowerCase() === user.name.trim().toLowerCase());
    if (user?.role === "organization") return members.filter((member) => member.organization.trim().toLowerCase() === (user.organizationName ?? user.name).trim().toLowerCase());
    return members;
  }, [members, user]);

  const projects = useMemo(() => {
    const grouped = new Map<string, { projectId: string; projectTitle: string; organization: string; members: TeamMember[] }>();
    for (const member of scopedMembers) {
      const group = grouped.get(member.projectId) ?? {
        projectId: member.projectId,
        projectTitle: member.projectTitle || "Untitled project",
        organization: member.organization || "Organization not specified",
        members: [],
      };
      group.members.push(member);
      grouped.set(member.projectId, group);
    }
    return [...grouped.values()].sort((a, b) => a.projectTitle.localeCompare(b.projectTitle));
  }, [scopedMembers]);

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link><Link href="/applications" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16} /> Applications</Link></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><Users size={16} /> Collaboration</div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{user?.role === "student" ? "My Teams" : user?.role === "organization" ? "Organization Teams" : "All Teams"}<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Projects where student participation has been accepted. Open a workspace to coordinate work and submit deliverables.</p></div>
        {warning && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">Projects joined</p><p className="mt-2 text-3xl font-semibold tabular-nums">{projects.length}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">Accepted contributors</p><p className="mt-2 text-3xl font-semibold tabular-nums">{members.length}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">MicroQuest links</p><p className="mt-2 text-3xl font-semibold tabular-nums">{members.reduce((sum, member) => sum + (member.microquestIds?.length ?? 0), 0)}</p></div></div>
        {!hasLoaded ? <p className="py-12 text-center text-sm text-slate-500">Loading teams...</p> : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0D121B] px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><BriefcaseBusiness size={22} /></div><h2 className="mt-4 text-lg font-semibold">No team memberships yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Accept a student application from the Applications page. Accepted contributors will appear here automatically.</p><Link href="/applications" className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Review applications</Link></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">{projects.map((project) => (
            <article key={project.projectId} className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-cyan-300">{project.organization}</p><h2 className="mt-1 text-lg font-semibold">{project.projectTitle}</h2><p className="mt-2 text-xs text-slate-500">{project.members.length} accepted contributor(s)</p></div><div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300"><Layers3 size={20} /></div></div>
              <div className="mt-5 space-y-2">{project.members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div><p className="text-sm font-medium text-slate-200">{member.studentName}</p><p className="mt-1 text-xs text-slate-500">{member.role} · joined {formatDate(member.joinedAt)}</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Accepted</span></div>)}</div>
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#080B10] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked MicroQuests</p>{project.members.some((member) => member.microquestTitles?.length) ? <p className="mt-2 text-sm leading-6 text-slate-300">{[...new Set(project.members.flatMap((member) => member.microquestTitles ?? []))].join(" · ")}</p> : <p className="mt-2 text-sm text-slate-500">Whole-project participation</p>}</div>
              <Link href={`/workspace/${encodeURIComponent(project.projectId)}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Open project workspace <ExternalLink size={15} /></Link>
            </article>
          ))}</div>
        )}
        <p className="mt-8 flex items-center gap-2 text-xs leading-5 text-amber-100/70"><CalendarDays size={14} /> Demo note: this page shows accepted members saved in this browser. It is not yet a shared live team roster.</p>
      </main>
    </div>
  );
}
