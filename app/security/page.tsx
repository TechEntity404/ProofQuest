"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Clock3, FileCheck2, ShieldCheck, Users } from "lucide-react";

type ActivityItem = { id: string; projectId: string; actor: string; message: string; createdAt: string };
type Application = { id: string; projectId: string; projectTitle?: string; studentName: string; status: string; submittedAt?: string; reviewedAt?: string };
type Submission = { id: string; projectId: string; projectTitle?: string; submitterName: string; status: string; submittedAt?: string; reviewedAt?: string };
type Project = { id: string; title: string; status: string; reviewNote?: string };

type LogEvent = { id: string; title: string; detail: string; actor: string; at: string; category: string };
const KEYS = {
  activity: "proofquest_workspace_activity_v1",
  projectApps: "proofquest_project_applications_v1",
  microquestApps: "proofquest_microquest_applications_v1",
  submissions: "proofquest_submissions_v1",
  projects: "proofquest_challenges_v1",
};
function readList<T>(key: string): T[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${key} must contain a list.`);
  return parsed as T[];
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SecurityPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [warning, setWarning] = useState("");
  const [filter, setFilter] = useState("All activity");

  useEffect(() => {
    try {
      const activity = readList<ActivityItem>(KEYS.activity);
      const projectApps = readList<Application>(KEYS.projectApps);
      const microquestApps = readList<Application>(KEYS.microquestApps);
      const submissions = readList<Submission>(KEYS.submissions);
      const projects = readList<Project>(KEYS.projects);
      const rows: LogEvent[] = [];
      for (const item of activity) {
        if (item.createdAt) rows.push({ id: `activity-${item.id}`, title: "Workspace activity", detail: item.message, actor: item.actor || "Unknown participant", at: item.createdAt, category: "Workspace" });
      }
      for (const item of [...projectApps, ...microquestApps]) {
        if (item.submittedAt) rows.push({ id: `application-${item.id}`, title: "Application received", detail: `${item.studentName} applied to ${item.projectTitle || "a project"}.`, actor: item.studentName, at: item.submittedAt, category: "Applications" });
        if (item.reviewedAt) rows.push({ id: `application-review-${item.id}`, title: `Application ${item.status.toLowerCase()}`, detail: `${item.studentName}'s request for ${item.projectTitle || "a project"} was marked ${item.status.toLowerCase()}.`, actor: "Project owner (name not recorded)", at: item.reviewedAt, category: "Applications" });
      }
      for (const item of submissions) {
        if (item.submittedAt) rows.push({ id: `submission-${item.id}`, title: "Deliverable submitted", detail: `${item.submitterName} submitted work for ${item.projectTitle || "a project"}.`, actor: item.submitterName, at: item.submittedAt, category: "Submissions" });
        if (item.reviewedAt) rows.push({ id: `submission-review-${item.id}`, title: `Deliverable ${item.status.toLowerCase()}`, detail: `${item.projectTitle || "A project"}: work submitted by ${item.submitterName} was marked ${item.status.toLowerCase()}.`, actor: "Reviewer (name not recorded)", at: item.reviewedAt, category: "Reviews" });
      }
      for (const item of projects) {
        if (item.status === "Rejected" && item.reviewNote) rows.push({ id: `project-rejection-${item.id}`, title: "Project review note", detail: `${item.title}: ${item.reviewNote}`, actor: "University coordinator (name not recorded)", at: "", category: "Project review" });
      }
      setEvents(rows.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()));
    } catch (error) {
      console.error("Could not build activity view:", error);
      setWarning("Some activity records could not be read. Avoid clearing browser storage until you have checked the affected page.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const categories = ["All activity", "Workspace", "Applications", "Submissions", "Reviews", "Project review"];
  const visible = useMemo(() => events.filter((event) => filter === "All activity" || event.category === filter), [events, filter]);

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link><Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16}/> Dashboard</Link></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck size={16}/> Transparency and oversight</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Security & Logs<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A consolidated view of recorded workspace activity, applications and deliverable reviews.</p></div>
        {warning && <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><Activity size={15}/> Recorded events</div><p className="mt-2 text-3xl font-semibold">{events.length}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><Users size={15}/> Activity categories</div><p className="mt-2 text-3xl font-semibold">{new Set(events.map((event) => event.category)).size}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><FileCheck2 size={15}/> Review records</div><p className="mt-2 text-3xl font-semibold">{events.filter((event) => event.category === "Reviews").length}</p></div></div>
        <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5 sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Activity timeline</h2><p className="mt-1 text-sm text-slate-500">Events are reconstructed from records currently saved in this browser.</p></div><select value={filter} onChange={(event: { target: { value: string } }) => setFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-300">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          {!loaded ? <p className="py-10 text-center text-sm text-slate-500">Loading activity...</p> : visible.length ? <div className="space-y-3">{visible.map((event) => <article key={event.id} className="flex gap-3 rounded-xl border border-white/[0.07] bg-[#080B10] p-4"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Clock3 size={16}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{event.title}</h3><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">{event.category}</span></div><p className="mt-1 text-sm leading-6 text-slate-300">{event.detail}</p><p className="mt-2 text-xs text-slate-500">{event.actor} · {event.at ? formatDate(event.at) : "Timestamp not recorded"}</p></div></article>)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-10 text-center"><Activity size={26} className="mx-auto text-slate-500"/><h3 className="mt-3 font-semibold">No recorded activity yet</h3><p className="mt-2 text-sm text-slate-500">Applications, workspace updates and review decisions will appear here as you test the workflow.</p></div>}
        </section>
        <section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5"><h2 className="font-semibold text-amber-100">Important security boundary</h2><p className="mt-2 text-sm leading-6 text-amber-100/75">This page is an activity viewer, not a tamper-proof audit system. Browser-stored records can be edited or deleted by the person using that browser. Before a real launch, add authenticated roles, server-side permission checks, database Row Level Security, private file storage and server-generated audit events.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">Role-based access</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">Server-side validation</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">Private evidence storage</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">Append-only audit events</span></div></section>
      </main>
    </div>
  );
}
