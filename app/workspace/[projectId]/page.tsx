"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { hasPermission } from "@/lib/proofquest-auth";
import { useProofQuestAuth } from "@/lib/use-proofquest-auth";
import { ArrowLeft, Activity, BriefcaseBusiness, CalendarDays, ClipboardList, ExternalLink, FileUp, MessageSquare, Users } from "lucide-react";

type Project = { id: string; title: string; organization: string; category: string; description: string; skills: string[]; difficulty: string; timeCommitment: string; deadline: string; deliverable: string; status: string };
type MicroQuest = { id: string; projectId: string; projectTitle: string; title: string; description: string; skills: string[]; deliverable: string; status: string; deadline: string };
type TeamMember = { id: string; projectId: string; studentName: string; role: string; joinedAt: string };
type ActivityItem = { id: string; projectId: string; actor: string; message: string; createdAt: string };
type SubmissionStatus = "Submitted" | "Accepted" | "Changes requested";
type Submission = { id: string; projectId: string; projectTitle: string; organization: string; questId?: string; questTitle?: string; submitterName: string; url: string; notes: string; status: SubmissionStatus; submittedAt: string; reviewerFeedback?: string; reviewedAt?: string };

const CHALLENGE_KEY = "proofquest_challenges_v1";
const MICROQUEST_KEY = "proofquest_microquests_v1";
const TEAM_KEY = "proofquest_team_members_v1";
const ACTIVITY_KEY = "proofquest_workspace_activity_v1";
const SUBMISSION_KEY = "proofquest_submissions_v1";

function safeList<T>(key: string): T[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as T[] : [];
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProjectWorkspacePage() {
  const { user } = useProofQuestAuth();
  const params = useParams<{ projectId: string }>();
  const projectId = decodeURIComponent(params.projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [quests, setQuests] = useState<MicroQuest[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [warning, setWarning] = useState("");
  const [updateForm, setUpdateForm] = useState({ actor: "", message: "" });
  const [submissionForm, setSubmissionForm] = useState({ questId: "", submitterName: "", url: "", notes: "" });

  useEffect(() => {
    if (user?.name) {
      setUpdateForm((current) => ({ ...current, actor: current.actor || user.name }));
      setSubmissionForm((current) => ({ ...current, submitterName: current.submitterName || user.name }));
    }
  }, [user]);

  useEffect(() => {
    try {
      const projects = safeList<Project>(CHALLENGE_KEY);
      setProject(projects.find((item) => item.id === projectId) ?? null);
      setQuests(safeList<MicroQuest>(MICROQUEST_KEY).filter((item) => item.projectId === projectId));
      setMembers(safeList<TeamMember>(TEAM_KEY).filter((item) => item.projectId === projectId));
      setActivity(safeList<ActivityItem>(ACTIVITY_KEY).filter((item) => item.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setSubmissions(safeList<Submission>(SUBMISSION_KEY).filter((item) => item.projectId === projectId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    } catch (error) {
      console.error("Could not load project workspace:", error);
      setWarning("Some workspace data could not be loaded. Check browser storage before editing.");
    } finally {
      setHasLoaded(true);
    }
  }, [projectId]);

  const openQuests = useMemo(() => quests.filter((quest) => quest.status !== "Completed"), [quests]);

  const addUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!updateForm.actor.trim() || !updateForm.message.trim()) return;
    const next: ActivityItem = { id: `activity-${Date.now()}`, projectId, actor: updateForm.actor.trim(), message: updateForm.message.trim(), createdAt: new Date().toISOString() };
    const all = safeList<ActivityItem>(ACTIVITY_KEY);
    all.unshift(next);
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
    setActivity((current) => [next, ...current]);
    setUpdateForm({ actor: "", message: "" });
  };

  const submitDeliverable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission(user?.role, "submission:create")) { window.alert("Only student contributors can submit deliverables."); return; }
    if (!project || !submissionForm.submitterName.trim() || !submissionForm.url.trim()) return;
    let parsedUrl: URL;
    try { parsedUrl = new URL(submissionForm.url.trim()); } catch { window.alert("Enter a valid https:// or http:// link."); return; }
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") { window.alert("Only web links can be submitted in this prototype."); return; }
    const quest = quests.find((item) => item.id === submissionForm.questId);
    const next: Submission = {
      id: `submission-${Date.now()}`,
      projectId,
      projectTitle: project.title,
      organization: project.organization,
      questId: quest?.id,
      questTitle: quest?.title,
      submitterName: submissionForm.submitterName.trim(),
      url: parsedUrl.toString(),
      notes: submissionForm.notes.trim(),
      status: "Submitted",
      submittedAt: new Date().toISOString(),
    };
    const all = safeList<Submission>(SUBMISSION_KEY);
    all.unshift(next);
    window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify(all));
    setSubmissions((current) => [next, ...current]);
    const update: ActivityItem = { id: `activity-${Date.now()}-submission`, projectId, actor: next.submitterName, message: `Submitted ${quest ? `the MicroQuest “${quest.title}”` : "a project deliverable"} for review.`, createdAt: new Date().toISOString() };
    const allActivity = safeList<ActivityItem>(ACTIVITY_KEY);
    allActivity.unshift(update);
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(allActivity));
    setActivity((current) => [update, ...current]);
    setSubmissionForm({ questId: "", submitterName: "", url: "", notes: "" });
    window.alert("Deliverable submitted. The project owner can review it from the Reviews page.");
  };

  if (!hasLoaded) return <div className="min-h-screen bg-[#080B10] p-10 text-slate-400">Loading workspace...</div>;
  if (!project) return <div className="min-h-screen bg-[#080B10] p-10 text-slate-100"><h1 className="text-2xl font-bold">Project not found</h1><p className="mt-2 text-slate-400">The project may have been removed from this browser&apos;s saved data.</p><Link href="/my-teams" className="mt-5 inline-flex text-cyan-300">Return to My Teams</Link></div>;
  const isStudentMember = members.some((member) => member.studentName.trim().toLowerCase() === (user?.name ?? "").trim().toLowerCase());
  const isOwnOrganization = project.organization.trim().toLowerCase() === (user?.organizationName ?? "").trim().toLowerCase();
  if (user?.role === "student" && !isStudentMember) return <div className="min-h-screen bg-[#080B10] p-10 text-slate-100"><h1 className="text-2xl font-bold">This is not your team workspace</h1><p className="mt-2 text-slate-400">Only accepted project contributors can open this workspace.</p><Link href="/my-teams" className="mt-5 inline-flex text-cyan-300">Return to My Teams</Link></div>;
  if (user?.role === "organization" && !isOwnOrganization) return <div className="min-h-screen bg-[#080B10] p-10 text-slate-100"><h1 className="text-2xl font-bold">Organization access restricted</h1><p className="mt-2 text-slate-400">This project belongs to a different organization.</p><Link href="/my-teams" className="mt-5 inline-flex text-cyan-300">Return to My Teams</Link></div>;

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4"><Link href="/my-teams" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300"><ArrowLeft size={16} /> My Teams</Link><div className="flex flex-wrap gap-2"><Link href="/reviews" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300">Reviews inbox</Link><Link href="/applications" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300">Applications</Link></div></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        {warning && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        <div className="mb-8"><p className="mb-2 flex items-center gap-2 text-sm text-cyan-300"><BriefcaseBusiness size={16} /> Project workspace</p><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{project.title}<span className="text-cyan-400">.</span></h1><p className="mt-2 text-sm text-slate-400">{project.organization} · {project.category} · {project.status}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{project.description}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] px-5 py-4"><p className="text-xs text-slate-500">Project deadline</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-200"><CalendarDays size={15} className="text-cyan-300" />{project.deadline || "Not specified"}</p><p className="mt-3 text-xs text-slate-500">Expected outcome</p><p className="mt-1 max-w-xs text-sm text-slate-200">{project.deliverable}</p></div></div></div>
        <div className="mb-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">Team members</p><p className="mt-2 text-3xl font-semibold">{members.length}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">MicroQuests</p><p className="mt-2 text-3xl font-semibold">{quests.length}</p></div><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">Submissions</p><p className="mt-2 text-3xl font-semibold">{submissions.length}</p></div></div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="mb-4 flex items-center gap-2"><Users size={18} className="text-cyan-300" /><h2 className="text-lg font-semibold">Project team</h2></div>{members.length ? <div className="grid gap-3 sm:grid-cols-2">{members.map((member) => <div key={member.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><p className="font-medium">{member.studentName}</p><p className="mt-1 text-xs text-slate-500">{member.role} · Joined {new Date(member.joinedAt).toLocaleDateString("en-IN")}</p></div>)}</div> : <p className="text-sm text-slate-500">No accepted contributors recorded yet.</p>}</section>
            <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-cyan-300" /><h2 className="text-lg font-semibold">Work items</h2></div>{quests.length ? <div className="space-y-3">{quests.map((quest) => <article key={quest.id} className="rounded-xl border border-white/[0.07] bg-[#080B10] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{quest.title}</h3><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">{quest.status}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{quest.description}</p><p className="mt-2 text-xs text-slate-500">Deliverable: {quest.deliverable}</p></article>)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-4"><p className="text-sm text-slate-400">This project has no MicroQuests. That is fine for a Direct Project: work can be submitted as one project-level deliverable.</p><Link href="/microquests" className="mt-3 inline-flex text-sm text-cyan-300">Explore MicroQuests <ExternalLink size={14} className="ml-1" /></Link></div>}</section>
            <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-cyan-300" /><h2 className="text-lg font-semibold">Project activity</h2></div><form onSubmit={addUpdate} className="mb-5 grid gap-3 sm:grid-cols-[0.7fr_1.3fr_auto]"><input required maxLength={80} value={updateForm.actor} onChange={(event) => setUpdateForm((current) => ({ ...current, actor: event.target.value }))} placeholder="Your name" className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none focus:border-cyan-400/50"/><input required maxLength={300} value={updateForm.message} onChange={(event) => setUpdateForm((current) => ({ ...current, message: event.target.value }))} placeholder="Share a progress update..." className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none focus:border-cyan-400/50"/><button className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Post update</button></form>{activity.length ? <div className="space-y-3">{activity.map((item) => <div key={item.id} className="flex gap-3 border-t border-white/[0.06] pt-3"><div className="mt-0.5 rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MessageSquare size={15}/></div><div><p className="text-sm text-slate-200"><span className="font-medium">{item.actor}</span> <span className="text-slate-400">{item.message}</span></p><p className="mt-1 text-xs text-slate-600">{formatDate(item.createdAt)}</p></div></div>)}</div> : <p className="text-sm text-slate-500">No updates yet. Share the first progress update.</p>}</section>
          </div>
          <div className="space-y-6">
            {hasPermission(user?.role, "submission:create") && <section className="rounded-2xl border border-cyan-400/20 bg-[#0D121B] p-5"><div className="mb-4 flex items-center gap-2"><FileUp size={18} className="text-cyan-300"/><h2 className="text-lg font-semibold">Submit deliverable</h2></div><p className="mb-4 text-sm leading-6 text-slate-400">Share a GitHub repository, deployed website, document or other accessible link. Your submission will enter the review queue.</p><form onSubmit={submitDeliverable} className="space-y-3"><label className="block text-sm text-slate-300">Work item<select value={submissionForm.questId} onChange={(event) => setSubmissionForm((current) => ({ ...current, questId: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none"><option value="">Whole project / final deliverable</option>{quests.map((quest) => <option key={quest.id} value={quest.id}>{quest.title}</option>)}</select></label><label className="block text-sm text-slate-300">Submitted by<input required maxLength={80} value={submissionForm.submitterName} onChange={(event) => setSubmissionForm((current) => ({ ...current, submitterName: event.target.value }))} placeholder="Contributor name" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none focus:border-cyan-400/50"/></label><label className="block text-sm text-slate-300">Deliverable URL<input required type="url" value={submissionForm.url} onChange={(event) => setSubmissionForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://github.com/..." className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none focus:border-cyan-400/50"/></label><label className="block text-sm text-slate-300">Notes <span className="text-slate-500">(optional)</span><textarea rows={3} maxLength={1000} value={submissionForm.notes} onChange={(event) => setSubmissionForm((current) => ({ ...current, notes: event.target.value }))} placeholder="What did you complete? Any setup instructions?" className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm outline-none focus:border-cyan-400/50"/></label><button type="submit" className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Submit for review</button></form></section>}
            <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><h2 className="text-lg font-semibold">Recent submissions</h2>{submissions.length ? <div className="mt-4 space-y-3">{submissions.map((submission) => <article key={submission.id} className="rounded-xl border border-white/[0.07] bg-[#080B10] p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{submission.submitterName}</p><span className={`rounded-full px-2 py-1 text-[10px] ${submission.status === "Accepted" ? "bg-emerald-400/10 text-emerald-300" : submission.status === "Changes requested" ? "bg-amber-400/10 text-amber-200" : "bg-cyan-400/10 text-cyan-200"}`}>{submission.status}</span></div><p className="mt-1 text-xs text-slate-500">{submission.questTitle || "Final project deliverable"}</p><a href={submission.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">Open submission <ExternalLink size={12}/></a>{submission.reviewerFeedback && <p className="mt-2 rounded-lg bg-white/[0.03] p-2 text-xs text-slate-400">Feedback: {submission.reviewerFeedback}</p>}</article>)}</div> : <p className="mt-3 text-sm text-slate-500">No deliverables submitted yet.</p>}<Link href="/reviews" className="mt-4 inline-flex text-sm text-cyan-300">Go to review queue <ExternalLink size={14} className="ml-1"/></Link></section>
          </div>
        </div>
        <p className="mt-8 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/75">Prototype note: updates, submissions and team membership are stored locally in this browser. This workspace is a demo of the end-to-end workflow, not a secure shared collaboration environment yet.</p>
      </main>
    </div>
  );
}
