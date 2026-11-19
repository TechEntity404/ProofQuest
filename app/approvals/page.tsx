"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type ChallengeStatus = "Open" | "Pending review" | "Rejected";

type Challenge = {
  id: string;
  title: string;
  organization: string;
  category: string;
  description: string;
  skills: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  timeCommitment: string;
  deadline: string;
  deliverable: string;
  status: ChallengeStatus;
  reviewNote?: string;
};

type FilterType = "Pending review" | "Open" | "Rejected" | "All";

const STORAGE_KEY = "proofquest_challenges_v1";

function formatDeadline(date: string) {
  if (!date) return "Not specified";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ApprovalsPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [filter, setFilter] = useState<FilterType>("Pending review");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // Read the same project data used by the Challenge Hub.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setChallenges(parsed as Challenge[]);
        }
      }
    } catch {
      console.warn("Could not load PROOFQUEST project data.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Save every approval decision to the same browser storage.
  useEffect(() => {
    if (!hasLoaded) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(challenges)
      );
    } catch {
      console.warn("Could not save PROOFQUEST project data.");
    }
  }, [challenges, hasLoaded]);

  const counts = useMemo(
    () => ({
      pending: challenges.filter(
        (item) => item.status === "Pending review"
      ).length,
      approved: challenges.filter(
        (item) => item.status === "Open"
      ).length,
      rejected: challenges.filter(
        (item) => item.status === "Rejected"
      ).length,
    }),
    [challenges]
  );

  const visibleChallenges = useMemo(() => {
    if (filter === "All") return challenges;

    return challenges.filter((item) => item.status === filter);
  }, [challenges, filter]);

  function approveProject(id: string) {
    setChallenges((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Open",
              reviewNote: "Approved by the university coordinator.",
            }
          : item
      )
    );
  }

  function rejectProject(id: string) {
    if (!feedback.trim()) return;

    setChallenges((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Rejected",
              reviewNote: feedback.trim(),
            }
          : item
      )
    );

    setRejectingId(null);
    setFeedback("");
  }

  function startRejecting(id: string) {
    setRejectingId(id);
    setFeedback("");
  }

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0B0F16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">
              PQ
            </div>

            <div>
              <p className="font-semibold tracking-wide">PROOFQUEST</p>
              <p className="text-xs text-slate-500">
                University coordinator
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/challenges"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              Challenge Hub
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* Page title */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
            <ShieldCheck size={17} />
            Trust & governance
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Project Approvals<span className="text-cyan-400">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Review opportunities submitted by organizations before
            making them available to students.
          </p>
        </div>

        {/* Statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-400/15 bg-[#0D121B] p-5">
            <p className="text-sm text-slate-400">Pending review</p>
            <p className="mt-3 text-3xl font-semibold text-amber-300">
              {counts.pending}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Awaiting coordinator action
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/15 bg-[#0D121B] p-5">
            <p className="text-sm text-slate-400">Approved projects</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-300">
              {counts.approved}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Published in the Challenge Hub
            </p>
          </div>

          <div className="rounded-2xl border border-red-400/15 bg-[#0D121B] p-5">
            <p className="text-sm text-slate-400">Rejected projects</p>
            <p className="mt-3 text-3xl font-semibold text-red-300">
              {counts.rejected}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Feedback recorded
            </p>
          </div>
        </section>

        {/* Review information */}
        <section className="mb-7 flex flex-col gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <GraduationCap size={21} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-200">
              University review comes first
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Only approved projects are published as opportunities
              for students. Rejections should include clear feedback.
            </p>
          </div>
        </section>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {(
            [
              "Pending review",
              "Open",
              "Rejected",
              "All",
            ] as FilterType[]
          ).map((item) => {
            const active = filter === item;

            return (
              <button
                key={item}
                onClick={() => {
                  setFilter(item);
                  setRejectingId(null);
                  setFeedback("");
                }}
                className={`rounded-xl px-4 py-2.5 text-sm transition ${
                  active
                    ? "bg-cyan-400 font-semibold text-slate-950"
                    : "border border-white/10 bg-[#0D121B] text-slate-400 hover:border-cyan-400/30 hover:text-slate-200"
                }`}
              >
                {item === "Open" ? "Approved" : item}
              </button>
            );
          })}
        </div>

        {/* Project review queue */}
        <section className="space-y-4">
          {visibleChallenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#0D121B] px-5 py-16 text-center">
              <FileCheck2
                size={30}
                className="mx-auto mb-3 text-slate-500"
              />
              <h2 className="font-semibold">Nothing to review here</h2>
              <p className="mt-2 text-sm text-slate-500">
                Projects matching this filter will appear here.
              </p>
              <Link
                href="/challenges"
                className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
              >
                Open Challenge Hub
                <ArrowUpRight size={15} />
              </Link>
            </div>
          ) : (
            visibleChallenges.map((challenge) => (
              <article
                key={challenge.id}
                className="rounded-2xl border border-white/10 bg-[#0D121B] p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                        {challenge.category}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          challenge.status === "Open"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : challenge.status === "Rejected"
                              ? "bg-red-400/10 text-red-300"
                              : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {challenge.status === "Open"
                          ? "Approved"
                          : challenge.status === "Rejected"
                            ? "Rejected"
                            : "Pending review"}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold">
                      {challenge.title}
                    </h2>

                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Building2 size={15} />
                      {challenge.organization}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 text-xs text-slate-400">
                    <span className="flex h-fit items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2">
                      <Clock3 size={14} />
                      {challenge.timeCommitment}
                    </span>

                    <span className="flex h-fit items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2">
                      <CalendarDays size={14} />
                      {formatDeadline(challenge.deadline)}
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  {challenge.description}
                </p>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Required skills
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {challenge.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-[#080B10] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Expected deliverable
                  </p>
                  <p className="text-sm leading-6 text-slate-300">
                    {challenge.deliverable}
                  </p>
                </div>

                {challenge.reviewNote && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <MessageSquareText
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        Coordinator feedback
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {challenge.reviewNote}
                      </p>
                    </div>
                  </div>
                )}

                {challenge.status === "Pending review" && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    {rejectingId === challenge.id ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Reason for rejection
                        </label>

                        <textarea
                          rows={3}
                          value={feedback}
                          onChange={(event) =>
                            setFeedback(event.target.value)
                          }
                          placeholder="Explain what needs to be improved..."
                          className="w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-red-400/50"
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => rejectProject(challenge.id)}
                            disabled={!feedback.trim()}
                            className="rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Confirm rejection
                          </button>

                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setFeedback("");
                            }}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => approveProject(challenge.id)}
                          className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                        >
                          <CheckCircle2 size={17} />
                          Approve project
                        </button>

                        <button
                          onClick={() => startRejecting(challenge.id)}
                          className="flex items-center gap-2 rounded-xl border border-red-400/25 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/10"
                        >
                          <XCircle size={17} />
                          Reject with feedback
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        <p className="mt-10 text-center text-xs leading-5 text-slate-600">
          PROOFQUEST prototype · Approval decisions are stored locally
          in this browser.
        </p>
      </main>
    </div>
  );
}