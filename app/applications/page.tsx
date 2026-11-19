"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hasPermission } from "@/lib/proofquest-auth";
import { useProofQuestAuth } from "@/lib/use-proofquest-auth";
import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3,
  Inbox, Search, Users, XCircle, Layers3, ExternalLink,
} from "lucide-react";

type ApplicationStatus = "Pending" | "Accepted" | "Declined";
type ApplicationKind = "Project" | "MicroQuest";

type ApplicationRecord = {
  id: string;
  kind: ApplicationKind;
  questId?: string;
  questTitle?: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  studentName: string;
  message: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
};

type TeamMember = {
  id: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  studentName: string;
  role: string;
  joinedAt: string;
  joinedVia: ApplicationKind;
  microquestIds: string[];
  microquestTitles: string[];
};

const MICROQUEST_APPLICATION_KEY = "proofquest_microquest_applications_v1";
const PROJECT_APPLICATION_KEY = "proofquest_project_applications_v1";
const TEAM_MEMBER_KEY = "proofquest_team_members_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArray(key: string): unknown[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${key} is not a list.`);
  return parsed;
}

function normalizeApplication(value: unknown, kind: ApplicationKind, index: number): ApplicationRecord | null {
  if (!isRecord(value) || typeof value.projectId !== "string" || typeof value.studentName !== "string") return null;
  const status: ApplicationStatus = value.status === "Accepted" || value.status === "Declined" ? value.status : "Pending";
  return {
    id: typeof value.id === "string" ? value.id : `${kind.toLowerCase()}-application-${index}`,
    kind,
    questId: typeof value.questId === "string" ? value.questId : undefined,
    questTitle: typeof value.questTitle === "string" ? value.questTitle : undefined,
    projectId: value.projectId,
    projectTitle: typeof value.projectTitle === "string" ? value.projectTitle : "Untitled project",
    organization: typeof value.organization === "string" ? value.organization : "Not specified",
    studentName: value.studentName,
    message: typeof value.message === "string" ? value.message : "",
    status,
    submittedAt: typeof value.submittedAt === "string" ? value.submittedAt : new Date(0).toISOString(),
    reviewedAt: typeof value.reviewedAt === "string" ? value.reviewedAt : undefined,
  };
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusClasses(status: ApplicationStatus) {
  if (status === "Accepted") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "Declined") return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function addTeamMembership(application: ApplicationRecord) {
  if (!application.projectId) return;
  const raw = window.localStorage.getItem(TEAM_MEMBER_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed)) throw new Error("Saved team records are not in the expected list format.");
  const members = parsed as TeamMember[];
  const normalizedName = application.studentName.trim().toLowerCase();
  const existingIndex = members.findIndex((member) =>
    member.projectId === application.projectId && member.studentName?.trim().toLowerCase() === normalizedName
  );

  if (existingIndex >= 0) {
    const existing = members[existingIndex];
    const nextIds = new Set(existing.microquestIds ?? []);
    const nextTitles = new Set(existing.microquestTitles ?? []);
    if (application.questId) nextIds.add(application.questId);
    if (application.questTitle) nextTitles.add(application.questTitle);
    members[existingIndex] = { ...existing, microquestIds: [...nextIds], microquestTitles: [...nextTitles] };
  } else {
    members.unshift({
      id: `member-${application.projectId}-${Date.now()}`,
      projectId: application.projectId,
      projectTitle: application.projectTitle,
      organization: application.organization,
      studentName: application.studentName,
      role: "Contributor",
      joinedAt: new Date().toISOString(),
      joinedVia: application.kind,
      microquestIds: application.questId ? [application.questId] : [],
      microquestTitles: application.questTitle ? [application.questTitle] : [],
    });
  }
  window.localStorage.setItem(TEAM_MEMBER_KEY, JSON.stringify(members));
}

export default function ApplicationsPage() {
  const { user } = useProofQuestAuth();
  const canManage = hasPermission(user?.role, "application:manage");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All requests" | ApplicationStatus>("All requests");
  const [kindFilter, setKindFilter] = useState<"All types" | ApplicationKind>("All types");
  const [saveWarning, setSaveWarning] = useState("");

  useEffect(() => {
    try {
      const microquestApps = parseArray(MICROQUEST_APPLICATION_KEY)
        .map((item, index) => normalizeApplication(item, "MicroQuest", index))
        .filter((item): item is ApplicationRecord => item !== null);
      const projectApps = parseArray(PROJECT_APPLICATION_KEY)
        .map((item, index) => normalizeApplication(item, "Project", index))
        .filter((item): item is ApplicationRecord => item !== null);
      const combined = [...projectApps, ...microquestApps].sort((a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      setApplications(combined);
      // One-time-compatible migration: accepted requests from the previous build
      // also become team records when this combined Applications page is opened.
      combined.filter((item) => item.status === "Accepted").forEach((item) => {
        try { addTeamMembership(item); } catch (membershipError) {
          console.warn("Could not migrate an accepted application into team membership:", membershipError);
        }
      });
    } catch (error) {
      console.error("Could not load PROOFQUEST applications:", error);
      setSaveWarning("Some saved applications could not be read. Check the browser console before changing browser data.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      const projectApps = applications.filter((item) => item.kind === "Project").map(({ kind, ...item }) => item);
      const microquestApps = applications.filter((item) => item.kind === "MicroQuest").map(({ kind, ...item }) => item);
      window.localStorage.setItem(PROJECT_APPLICATION_KEY, JSON.stringify(projectApps));
      window.localStorage.setItem(MICROQUEST_APPLICATION_KEY, JSON.stringify(microquestApps));
      setSaveWarning("");
    } catch (error) {
      console.error("Could not save PROOFQUEST applications:", error);
      setSaveWarning("Your latest application decision could not be saved in this browser.");
    }
  }, [applications, hasLoaded]);

  const updateStatus = (id: string, status: Exclude<ApplicationStatus, "Pending">) => {
    if (!canManage) { window.alert("Your role cannot review applications."); return; }
    const application = applications.find((item) => item.id === id);
    if (!application) return;
    if (status === "Accepted") {
      try {
        addTeamMembership(application);
      } catch (error) {
        console.error("Could not create team membership:", error);
        setSaveWarning("The request decision was not completed because the team record could not be saved. Check browser storage and try again.");
        return;
      }
    }
    setApplications((current) => current.map((item) => item.id === id
      ? { ...item, status, reviewedAt: new Date().toISOString() }
      : item
    ));
  };

  const scopedApplications = useMemo(() => {
    if (user?.role === "student") {
      return applications.filter((item) => item.studentName.trim().toLowerCase() === user.name.trim().toLowerCase());
    }
    if (user?.role === "organization") {
      const ownOrg = (user.organizationName ?? user.name).trim().toLowerCase();
      return applications.filter((item) => item.organization.trim().toLowerCase() === ownOrg);
    }
    return applications;
  }, [applications, user]);

  const pendingCount = scopedApplications.filter((item) => item.status === "Pending").length;
  const acceptedCount = scopedApplications.filter((item) => item.status === "Accepted").length;
  const declinedCount = scopedApplications.filter((item) => item.status === "Declined").length;

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedApplications.filter((item) => {
      const matchesStatus = filter === "All requests" || item.status === filter;
      const matchesKind = kindFilter === "All types" || item.kind === kindFilter;
      const searchable = [item.studentName, item.questTitle, item.projectTitle, item.organization, item.message].join(" ").toLowerCase();
      return matchesStatus && matchesKind && searchable.includes(query);
    });
  }, [scopedApplications, filter, kindFilter, search]);

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/my-teams" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><Users size={15} className="mr-1 inline" /> My Teams</Link>
            <Link href="/challenges" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16} /> Challenge Hub</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><Inbox size={16} /> {user?.role === "student" ? "Student workspace" : "Participation management"}</div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{user?.role === "student" ? "My Applications" : "Applications"}<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{user?.role === "student" ? "Track the status of your project and MicroQuest applications." : "Review students applying to a whole project or requesting a specific MicroQuest. Accepting a request adds the student to that project&apos;s team."}</p></div>
        {saveWarning && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{saveWarning}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-sm">Total requests</span><Users size={18} /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{applications.length}</p></div>
          <div className="rounded-2xl border border-amber-400/15 bg-[#0D121B] p-5"><div className="flex items-center justify-between text-amber-200"><span className="text-sm">Awaiting review</span><Clock3 size={18} /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{pendingCount}</p></div>
          <div className="rounded-2xl border border-emerald-400/15 bg-[#0D121B] p-5"><div className="flex items-center justify-between text-emerald-300"><span className="text-sm">Accepted</span><CheckCircle2 size={18} /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{acceptedCount}</p></div>
          <div className="rounded-2xl border border-rose-400/15 bg-[#0D121B] p-5"><div className="flex items-center justify-between text-rose-300"><span className="text-sm">Declined</span><XCircle size={18} /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{declinedCount}</p></div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold">{canManage ? "Student requests" : "Your request history"}</h2><p className="mt-1 text-sm text-slate-500">{canManage ? "Review the student&apos;s interest and the project or task they want to join." : "Your applications and their latest decisions appear here."}</p></div>
            <div className="flex flex-col gap-3 sm:flex-row"><label className="relative block sm:min-w-64"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students or projects" className="w-full rounded-xl border border-white/10 bg-[#080B10] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/50" /></label>
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)} className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-300 outline-none"><option>All types</option><option>Project</option><option>MicroQuest</option></select>
              <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-300 outline-none"><option>All requests</option><option>Pending</option><option>Accepted</option><option>Declined</option></select>
            </div>
          </div>

          {!hasLoaded ? <p className="py-12 text-center text-sm text-slate-500">Loading applications...</p> : filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Inbox size={22} /></div><h3 className="mt-4 text-base font-semibold">{applications.length === 0 ? "No applications yet" : "No matching requests"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{applications.length === 0 ? "Project applications appear when students use Apply to project. MicroQuest requests appear when they select Request to join." : "Try another search term or change the filters."}</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/challenges" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Browse projects</Link><Link href="/microquests" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Browse MicroQuests</Link></div></div>
          ) : (
            <div className="space-y-3">{filteredApplications.map((application) => (
              <article key={`${application.kind}-${application.id}`} className="rounded-2xl border border-white/10 bg-[#080B10]/70 p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-slate-100">{application.studentName}</h3><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(application.status)}`}>{application.status}</span><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">{application.kind} application</span></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[11px] uppercase tracking-wide text-slate-500">Project</p><p className="mt-1 text-sm font-medium text-cyan-200">{application.projectTitle}</p><p className="mt-1 text-xs text-slate-500">{application.organization}</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[11px] uppercase tracking-wide text-slate-500">{application.kind === "MicroQuest" ? "Requested MicroQuest" : "Application type"}</p><p className="mt-1 text-sm font-medium text-slate-200">{application.questTitle || "Whole project"}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13} /> Submitted {formatDate(application.submittedAt)}</p></div></div>
                <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[11px] uppercase tracking-wide text-slate-500">Why they want to contribute</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{application.message || "The student did not add a message."}</p></div>
                {application.reviewedAt && <p className="mt-3 text-xs text-slate-500">Decision recorded: {formatDate(application.reviewedAt)}</p>}
              </div>
              {canManage && application.status === "Pending" && <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:w-40 xl:flex-col"><button type="button" onClick={() => updateStatus(application.id, "Accepted")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"><CheckCircle2 size={16} /> Accept request</button><button type="button" onClick={() => updateStatus(application.id, "Declined")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/25 px-4 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-400/10"><XCircle size={16} /> Decline</button></div>}
              {canManage && application.status === "Accepted" && <Link href={`/workspace/${encodeURIComponent(application.projectId)}`} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-400/25 px-4 py-2.5 text-sm text-cyan-200 hover:bg-cyan-400/10">Open workspace <ExternalLink size={15} /></Link>}
              </div></article>
            ))}</div>
          )}
        </section>
        <p className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/75">Prototype limitation: application names are user-entered and not verified. Accepting a request creates a browser-local team membership; real multi-user permissions require authentication and database policies.</p>
      </main>
    </div>
  );
}
