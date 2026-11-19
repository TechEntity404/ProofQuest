"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hasPermission } from "@/lib/proofquest-auth";
import { useProofQuestAuth } from "@/lib/use-proofquest-auth";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, ExternalLink, MessageSquare, RefreshCcw } from "lucide-react";

type SubmissionStatus = "Submitted" | "Accepted" | "Changes requested";
type Submission = {
  id: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  questId?: string;
  questTitle?: string;
  submitterName: string;
  url: string;
  notes: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewerFeedback?: string;
  reviewedAt?: string;
};

const SUBMISSION_KEY = "proofquest_submissions_v1";
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function statusClasses(status: SubmissionStatus) {
  if (status === "Accepted") return "bg-emerald-400/10 text-emerald-300";
  if (status === "Changes requested") return "bg-amber-400/10 text-amber-200";
  return "bg-cyan-400/10 text-cyan-200";
}

export default function ReviewsPage() {
  const { user } = useProofQuestAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"All" | SubmissionStatus>("All");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SUBMISSION_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error("Submissions are not a list.");
      setSubmissions(parsed as Submission[]);
    } catch (error) {
      console.error("Could not load submissions:", error);
      setWarning("Submissions could not be loaded from browser storage.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  const persist = (next: Submission[]) => {
    try {
      window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify(next));
      setSubmissions(next);
      setWarning("");
    } catch (error) {
      console.error("Could not save review decision:", error);
      setWarning("The review decision could not be saved. Check browser storage and try again.");
    }
  };

  const decide = (id: string, status: Exclude<SubmissionStatus, "Submitted">) => {
    if (!hasPermission(user?.role, "submission:review")) { window.alert("Your role cannot review submissions."); return; }
    const item = submissions.find((submission) => submission.id === id);
    if (!item) return;
    const note = (feedback[id] ?? "").trim();
    if (status === "Changes requested" && !note) {
      window.alert("Add a short note explaining what should be changed before requesting changes.");
      return;
    }
    const reviewedAt = new Date().toISOString();
    const updated = submissions.map((submission) => submission.id === id
      ? { ...submission, status, reviewerFeedback: note, reviewedAt }
      : submission
    );

    try {
      if (status === "Accepted" && item.questId) {
        const questRaw = window.localStorage.getItem("proofquest_microquests_v1");
        const quests: unknown = questRaw ? JSON.parse(questRaw) : [];
        if (Array.isArray(quests)) {
          window.localStorage.setItem("proofquest_microquests_v1", JSON.stringify(quests.map((quest) =>
            typeof quest === "object" && quest !== null && (quest as { id?: string }).id === item.questId
              ? { ...quest, status: "Completed" }
              : quest
          )));
        }
      }

      const activityRaw = window.localStorage.getItem("proofquest_workspace_activity_v1");
      const activity: unknown = activityRaw ? JSON.parse(activityRaw) : [];
      if (Array.isArray(activity)) {
        activity.unshift({
          id: `review-${Date.now()}`,
          projectId: item.projectId,
          actor: "Project reviewer",
          message: status === "Accepted"
            ? `Accepted ${item.questTitle ? `the MicroQuest “${item.questTitle}”` : "a project deliverable"} submitted by ${item.submitterName}.`
            : `Requested changes to ${item.questTitle ? `the MicroQuest “${item.questTitle}”` : "a project deliverable"} submitted by ${item.submitterName}.`,
          createdAt: reviewedAt,
        });
        window.localStorage.setItem("proofquest_workspace_activity_v1", JSON.stringify(activity));
      }
    } catch (error) {
      console.error("Could not update linked task or activity records:", error);
      setWarning("The review decision was saved, but a linked task or activity record could not be updated.");
    }

    persist(updated);
  };

  const counts = useMemo(() => ({
    submitted: submissions.filter((item) => item.status === "Submitted").length,
    accepted: submissions.filter((item) => item.status === "Accepted").length,
    changes: submissions.filter((item) => item.status === "Changes requested").length,
  }), [submissions]);

  const roleScopedSubmissions = user?.role === "organization" ? submissions.filter((item) => item.organization.trim().toLowerCase() === (user.organizationName ?? user.name).trim().toLowerCase()) : submissions;
  const visible = roleScopedSubmissions.filter((item) => filter === "All" || item.status === filter).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">PQ</div><div><p className="font-semibold tracking-wide">PROOFQUEST</p><p className="text-xs text-slate-500">Open innovation platform</p></div></Link><Link href="/my-teams" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"><ArrowLeft size={16}/> My Teams</Link></div></header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-sm text-cyan-300"><ClipboardCheck size={16}/> Deliverable evaluation</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Reviews<span className="text-cyan-400">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Review submitted work, accept completed deliverables or request specific improvements. Feedback is saved with the submission.</p></div>
        {warning && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">{warning}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5"><p className="text-sm text-slate-400">Awaiting review</p><p className="mt-2 text-3xl font-semibold">{counts.submitted}</p></div><div className="rounded-2xl border border-emerald-400/15 bg-[#0D121B] p-5"><p className="text-sm text-emerald-300">Accepted</p><p className="mt-2 text-3xl font-semibold">{counts.accepted}</p></div><div className="rounded-2xl border border-amber-400/15 bg-[#0D121B] p-5"><p className="text-sm text-amber-200">Changes requested</p><p className="mt-2 text-3xl font-semibold">{counts.changes}</p></div></div>
        <section className="rounded-2xl border border-white/10 bg-[#0D121B] p-5 sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Submission queue</h2><p className="mt-1 text-sm text-slate-500">Open and inspect the submitted links before recording a decision.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-300"><option>All</option><option>Submitted</option><option>Accepted</option><option>Changes requested</option></select></div>
          {!hasLoaded ? <p className="py-10 text-center text-sm text-slate-500">Loading submissions...</p> : visible.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-12 text-center"><ClipboardCheck size={28} className="mx-auto text-slate-500"/><h3 className="mt-3 font-semibold">No submissions here yet</h3><p className="mt-2 text-sm text-slate-500">When a contributor submits a deliverable from a project workspace, it will appear in this queue.</p><Link href="/my-teams" className="mt-4 inline-flex text-sm text-cyan-300">Open My Teams</Link></div> : <div className="space-y-4">{visible.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#080B10]/70 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.projectTitle}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] ${statusClasses(item.status)}`}>{item.status}</span></div><p className="mt-1 text-xs text-slate-500">{item.organization} · Submitted by {item.submitterName}</p><p className="mt-2 text-sm text-slate-300">{item.questTitle || "Final project deliverable"}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/> {formatDate(item.submittedAt)}</p><a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 break-all text-sm text-cyan-300 hover:text-cyan-200">Open deliverable <ExternalLink size={14}/></a>{item.notes && <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm leading-6 text-slate-400">{item.notes}</p>}{item.reviewerFeedback && <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm leading-6 text-slate-400"><span className="font-medium text-slate-300">Previous feedback: </span>{item.reviewerFeedback}</p>}</div>
            {item.status === "Submitted" && hasPermission(user?.role, "submission:review") && <div className="w-full shrink-0 space-y-2 lg:max-w-xs"><label className="block text-xs text-slate-400">Review feedback<textarea rows={3} maxLength={1000} value={feedback[item.id] ?? ""} onChange={(event) => setFeedback((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Add feedback or explain requested changes..." className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#0D121B] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"/></label><button type="button" onClick={() => decide(item.id, "Accepted")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"><CheckCircle2 size={16}/> Accept deliverable</button><button type="button" onClick={() => decide(item.id, "Changes requested")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/25 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-400/10"><RefreshCcw size={15}/> Request changes</button></div>}
          </div></article>)}</div>}
        </section>
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/75"><MessageSquare size={14} className="mt-0.5 shrink-0"/> This prototype stores links and reviewer decisions locally. Review decisions are useful workflow records, not independent proof of authorship, originality or deliverable quality.</p>
      </main>
    </div>
  );
}
