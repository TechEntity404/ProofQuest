"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, FileCheck2, Users, Zap } from "lucide-react";

type Project = { id: string; title: string; organization: string; category?: string; status: string; deadline?: string };
type Member = { id: string; projectId: string; studentName: string; organization?: string };
type Submission = { id: string; projectId: string; submitterName: string; status: "Submitted" | "Accepted" | "Changes requested"; organization?: string; projectTitle?: string };
const KEYS = { projects: "proofquest_challenges_v1", members: "proofquest_team_members_v1", submissions: "proofquest_submissions_v1", quests: "proofquest_microquests_v1" };
function readList<T>(key: string): T[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${key} must contain a list.`);
  return parsed as T[];
}

export default function ImpactPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questCount, setQuestCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    try {
      setProjects(readList<Project>(KEYS.projects));
      setMembers(readList<Member>(KEYS.members));
      setSubmissions(readList<Submission>(KEYS.submissions));
      setQuestCount(readList<unknown>(KEYS.quests).length);
    } catch (error) {
      console.error("Could not load impact metrics:", error);
      setWarning("Some impact figures could not be calculated from the saved records.");
    } finally { setLoaded(true); }
  }, []);

  const approved = projects.filter((project) => project.status === "Open");
  const pending = projects.filter((project) => project.status === "Pending review");
  const rejected = projects.filter((project) => project.status === "Rejected");
  const accepted = submissions.filter((item) => item.status === "Accepted");
  const uniqueStudents = new Set(members.map((member) => member.studentName.trim().toLowerCase()).filter(Boolean)).size;
  const organizations = new Set(projects.map((project) => project.organization.trim().toLowerCase()).filter(Boolean)).size;
  const completionRate = submissions.length ? Math.round((accepted.length / submissions.length) * 100) : 0;
  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) counts.set(project.category || "General", (counts.get(project.category || "General") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link><Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16}/> Dashboard</Link></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><Zap size={16}/> Outcomes and progress</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Impact Dashboard<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A snapshot of real project, participation and deliverable records created while using this PROOFQUEST prototype.</p></div>
        {warning && <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        {!loaded ? <p className="py-12 text-center text-sm text-slate-500">Calculating impact...</p> : <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<BriefcaseBusiness size={17}/>} label="Total challenges" value={projects.length} note={`${approved.length} currently open`}/><Metric icon={<Building2 size={17}/>} label="Organizations" value={organizations} note="Named in project records"/><Metric icon={<Users size={17}/>} label="Accepted contributors" value={uniqueStudents} note={`${members.length} project memberships`}/><Metric icon={<FileCheck2 size={17}/>} label="Deliverables accepted" value={accepted.length} note={`${submissions.length} total submissions`}/></div>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><h2 className="text-lg font-semibold">Challenge pipeline</h2><p className="mt-1 text-sm text-slate-500">Current status of projects saved in the Challenge Hub.</p><div className="mt-6 space-y-5"><Progress label="Open opportunities" count={approved.length} total={projects.length} tone="bg-emerald-400"/><Progress label="Awaiting university review" count={pending.length} total={projects.length} tone="bg-amber-300"/><Progress label="Rejected submissions" count={rejected.length} total={projects.length} tone="bg-rose-400"/></div></section>
            <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><h2 className="text-lg font-semibold">Deliverable review</h2><p className="mt-1 text-sm text-slate-500">Accepted submissions as a share of all submissions.</p><div className="mt-6 flex items-center gap-5"><div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-cyan-400/20"><span className="text-2xl font-semibold tabular-nums">{completionRate}%</span></div><div><p className="text-sm text-slate-300">{accepted.length} accepted</p><p className="mt-1 text-sm text-slate-500">{submissions.length - accepted.length} awaiting review or changes</p><Link href="/reviews" className="mt-3 inline-flex text-sm text-cyan-300">Open review queue</Link></div></div></section></div>
          <section className="mt-5 rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Challenge categories</h2><p className="mt-1 text-sm text-slate-500">Distribution across project categories.</p></div><span className="text-xs text-slate-500">{questCount} MicroQuests created</span></div>{byCategory.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{byCategory.map(([category, count]) => <div key={category} className="rounded-xl border border-white/[0.07] bg-[#080B10] p-4"><p className="text-sm text-slate-300">{category}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p><p className="mt-1 text-xs text-slate-500">{count === 1 ? "challenge" : "challenges"}</p></div>)}</div> : <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No category data is available yet.</p>}</section>
        </>}
        <p className="mt-8 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/75"><CheckCircle2 size={14} className="mt-0.5 shrink-0"/> These metrics are calculated from records in the current browser. They describe prototype activity, not independently verified social or economic impact.</p>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: number; note: string }) { return <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-center gap-2 text-cyan-300">{icon}<span className="text-sm text-slate-400">{label}</span></div><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>; }
function Progress({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) { const width = total ? Math.min(100, (count / total) * 100) : 0; return <div><div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-300">{label}</span><span className="tabular-nums text-slate-400">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }}/></div></div>; }
