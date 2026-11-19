"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, BriefcaseBusiness, ExternalLink, Search, Users, FileCheck2 } from "lucide-react";

type Project = { id: string; title: string; organization: string; category?: string; description?: string; status?: string; deadline?: string; skills?: string[] };
type Member = { id: string; projectId: string; projectTitle?: string; organization?: string; studentName: string; joinedAt?: string };
type Submission = { id: string; projectId: string; organization?: string; status?: string; submitterName?: string };

const PROJECT_KEY = "proofquest_challenges_v1";
const TEAM_KEY = "proofquest_team_members_v1";
const SUBMISSION_KEY = "proofquest_submissions_v1";

function readList<T>(key: string): T[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${key} must contain a list.`);
  return parsed as T[];
}

export default function OrganizationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    try {
      setProjects(readList<Project>(PROJECT_KEY));
      setMembers(readList<Member>(TEAM_KEY));
      setSubmissions(readList<Submission>(SUBMISSION_KEY));
    } catch (error) {
      console.error("Could not load organization directory:", error);
      setWarning("Some directory data could not be read from this browser.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const organizations = useMemo(() => {
    const grouped = new Map<string, { name: string; projects: Project[]; members: Set<string>; submissions: number }>();
    for (const project of projects) {
      const name = (project.organization || "Unlisted organization").trim() || "Unlisted organization";
      const entry = grouped.get(name) ?? { name, projects: [], members: new Set<string>(), submissions: 0 };
      entry.projects.push(project);
      grouped.set(name, entry);
    }
    for (const member of members) {
      const name = (member.organization || "Unlisted organization").trim() || "Unlisted organization";
      const entry = grouped.get(name) ?? { name, projects: [], members: new Set<string>(), submissions: 0 };
      entry.members.add(member.studentName);
      grouped.set(name, entry);
    }
    for (const submission of submissions) {
      const name = (submission.organization || "Unlisted organization").trim() || "Unlisted organization";
      const entry = grouped.get(name) ?? { name, projects: [], members: new Set<string>(), submissions: 0 };
      entry.submissions += 1;
      grouped.set(name, entry);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, members, submissions]);

  const visible = organizations.filter((org) => {
    const text = [org.name, ...org.projects.flatMap((project) => [project.title, project.category ?? "", project.description ?? ""])].join(" ").toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const approvedProjects = projects.filter((project) => project.status === "Open").length;

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link><Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16}/> Dashboard</Link></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><Building2 size={16}/> Partner network</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Organizations<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Explore organizations represented in the Challenge Hub and see the projects, accepted contributors and deliverables associated with them.</p></div>
        {warning && <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        <section className="mb-7 grid gap-4 sm:grid-cols-3"><Stat label="Organizations listed" value={organizations.length}/><Stat label="Projects published" value={projects.length}/><Stat label="Open opportunities" value={approvedProjects}/></section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Organization directory</h2><p className="mt-1 text-sm text-slate-500">Directory entries are generated from saved project records.</p></div><div className="relative w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={(event: { target: { value: string } }) => setQuery(event.target.value)} placeholder="Search organizations or projects" className="w-full rounded-xl border border-white/10 bg-[#0D121B] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/50"/></div></div>
        {!loaded ? <p className="py-12 text-center text-sm text-slate-500">Loading organizations...</p> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#0D121B] px-6 py-14 text-center"><Building2 size={28} className="mx-auto text-slate-500"/><h3 className="mt-3 font-semibold">No organizations found</h3><p className="mt-2 text-sm text-slate-500">Publish a challenge with an organization name to create the first directory entry.</p><Link href="/challenges" className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Open Challenge Hub</Link></div> : <div className="grid gap-4 lg:grid-cols-2">{visible.map((org) => <article key={org.name} className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Building2 size={20}/></div><div className="min-w-0"><h3 className="truncate font-semibold">{org.name}</h3><p className="mt-1 text-xs text-slate-500">PROOFQUEST partner listing</p></div></div><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">{org.projects.length} project(s)</span></div>
          <div className="mt-5 grid grid-cols-3 gap-2"><MiniStat icon={<BriefcaseBusiness size={14}/>} label="Projects" value={org.projects.length}/><MiniStat icon={<Users size={14}/>} label="Contributors" value={org.members.size}/><MiniStat icon={<FileCheck2 size={14}/>} label="Submissions" value={org.submissions}/></div>
          <div className="mt-5 space-y-2">{org.projects.length ? org.projects.map((project) => <div key={project.id} className="rounded-xl border border-white/[0.07] bg-[#080B10] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{project.title}</p><span className={`rounded-full px-2 py-1 text-[10px] ${project.status === "Open" ? "bg-emerald-400/10 text-emerald-300" : project.status === "Rejected" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-200"}`}>{project.status || "Status unavailable"}</span></div><p className="mt-1 text-xs text-slate-500">{project.category || "General"}{project.deadline ? ` · Deadline: ${project.deadline}` : ""}</p><Link href="/challenges" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300">View in Challenge Hub <ExternalLink size={12}/></Link></div>) : <p className="text-sm text-slate-500">No project record is currently attached to this organization.</p>}</div>
        </article>)}</div>}
        <p className="mt-8 text-xs leading-5 text-amber-100/70">Prototype note: this directory is derived from project and contribution records saved in this browser. It is not yet a verified organization registry.</p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></div>; }
function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-center gap-1.5 text-slate-500">{icon}<span className="text-[10px]">{label}</span></div><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>; }
