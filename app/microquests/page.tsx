"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { hasPermission } from "@/lib/proofquest-auth";
import { useProofQuestAuth } from "@/lib/use-proofquest-auth";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type QuestStatus = "Open" | "Paused" | "Completed";
type QuestSource = "project-intelligence" | "manual" | "legacy";
type ApplicationStatus = "Pending" | "Accepted" | "Declined";

type MicroQuestApplication = {
  id: string;
  questId: string;
  questTitle: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  studentName: string;
  message: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
};

type StoredMicroQuest = {
  id: string;
  projectId: string;
  projectTitle: string;
  project: string;
  organization: string;
  title: string;
  description: string;
  skills: string[];
  difficulty: Difficulty;
  estimatedTime: string;
  timeCommitment: string;
  deadline: string;
  deliverable: string;
  status: QuestStatus;
  source: QuestSource;
  sourceSuggestionId?: string;
  createdAt: string;
};

type ApprovedProject = {
  id: string;
  title: string;
  organization: string;
  difficulty: Difficulty;
  timeCommitment: string;
  deadline: string;
  status: string;
};

const MICROQUEST_STORAGE_KEY = "proofquest_microquests_v1";
const CHALLENGE_STORAGE_KEY = "proofquest_challenges_v1";
const APPLICATION_STORAGE_KEY = "proofquest_microquest_applications_v1";

const emptyForm = {
  projectId: "",
  title: "",
  description: "",
  skills: "",
  difficulty: "Beginner" as Difficulty,
  estimatedTime: "2–4 hours",
  deadline: "",
  deliverable: "",
};

type FormState = typeof emptyForm;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeQuest(value: unknown, index: number): StoredMicroQuest | null {
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.description !== "string") {
    return null;
  }

  const difficulty: Difficulty =
    value.difficulty === "Intermediate" || value.difficulty === "Advanced"
      ? value.difficulty
      : "Beginner";

  const rawStatus = value.status;
  const status: QuestStatus =
    rawStatus === "Paused" || rawStatus === "Completed" ? rawStatus : "Open";

  const timeCommitment =
    typeof value.timeCommitment === "string"
      ? value.timeCommitment
      : typeof value.estimatedTime === "string"
        ? value.estimatedTime
        : "Not specified";

  const rawSource = value.source;
  const source: QuestSource =
    rawSource === "project-intelligence" || rawSource === "manual"
      ? rawSource
      : "legacy";

  return {
    id: typeof value.id === "string" ? value.id : `microquest-restored-${index}`,
    projectId: typeof value.projectId === "string" ? value.projectId : "",
    projectTitle:
      typeof value.projectTitle === "string"
        ? value.projectTitle
        : typeof value.project === "string"
          ? value.project
          : "Independent project",
    project: typeof value.project === "string" ? value.project : "",
    organization: typeof value.organization === "string" ? value.organization : "",
    title: value.title,
    description: value.description,
    skills: Array.isArray(value.skills)
      ? value.skills.filter((skill): skill is string => typeof skill === "string")
      : [],
    difficulty,
    estimatedTime:
      typeof value.estimatedTime === "string" ? value.estimatedTime : timeCommitment,
    timeCommitment,
    deadline: typeof value.deadline === "string" ? value.deadline : "",
    deliverable: typeof value.deliverable === "string" ? value.deliverable : "Not specified",
    status,
    source,
    sourceSuggestionId:
      typeof value.sourceSuggestionId === "string" ? value.sourceSuggestionId : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeApplication(value: unknown, index: number): MicroQuestApplication | null {
  if (
    !isRecord(value) ||
    typeof value.questId !== "string" ||
    typeof value.questTitle !== "string" ||
    typeof value.studentName !== "string"
  ) {
    return null;
  }

  const status: ApplicationStatus =
    value.status === "Accepted" || value.status === "Declined" ? value.status : "Pending";

  return {
    id: typeof value.id === "string" ? value.id : `application-restored-${index}`,
    questId: value.questId,
    questTitle: value.questTitle,
    projectId: typeof value.projectId === "string" ? value.projectId : "",
    projectTitle: typeof value.projectTitle === "string" ? value.projectTitle : "",
    organization: typeof value.organization === "string" ? value.organization : "",
    studentName: value.studentName,
    message: typeof value.message === "string" ? value.message : "",
    status,
    submittedAt: typeof value.submittedAt === "string" ? value.submittedAt : new Date().toISOString(),
    reviewedAt: typeof value.reviewedAt === "string" ? value.reviewedAt : undefined,
  };
}

function formatDate(date: string) {
  if (!date) return "No deadline";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MicroQuestsPage() {
  const { user } = useProofQuestAuth();
  const canManageQuest = (quest: StoredMicroQuest) =>
    user?.role === "admin" ||
    (user?.role === "organization" && quest.organization.trim().toLowerCase() === (user.organizationName ?? "").trim().toLowerCase());
  const [quests, setQuests] = useState<StoredMicroQuest[]>([]);
  const [approvedProjects, setApprovedProjects] = useState<ApprovedProject[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All levels");
  const [statusFilter, setStatusFilter] = useState("All quests");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saveWarning, setSaveWarning] = useState("");
  const [applications, setApplications] = useState<MicroQuestApplication[]>([]);
  const [joiningQuest, setJoiningQuest] = useState<StoredMicroQuest | null>(null);
  const [applicationForm, setApplicationForm] = useState({ studentName: "", message: "" });

  // Load both lists once when the page opens. The Challenge Hub and this page
  // share the same localStorage keys, so accepted suggestions appear here.
  useEffect(() => {
    try {
      const savedQuests = window.localStorage.getItem(MICROQUEST_STORAGE_KEY);
      if (savedQuests) {
        const parsed: unknown = JSON.parse(savedQuests);
        if (Array.isArray(parsed)) {
          setQuests(
            parsed
              .map((item, index) => normalizeQuest(item, index))
              .filter((item): item is StoredMicroQuest => item !== null)
          );
        }
      }

      const savedProjects = window.localStorage.getItem(CHALLENGE_STORAGE_KEY);
      if (savedProjects) {
        const parsed: unknown = JSON.parse(savedProjects);
        if (Array.isArray(parsed)) {
          const approved = parsed.filter(
            (item): item is ApprovedProject =>
              isRecord(item) &&
              typeof item.id === "string" &&
              typeof item.title === "string" &&
              typeof item.organization === "string" &&
              item.status === "Open"
          );
          setApprovedProjects(
            approved.map((project) => ({
              id: project.id,
              title: project.title,
              organization: project.organization,
              difficulty:
                project.difficulty === "Intermediate" || project.difficulty === "Advanced"
                  ? project.difficulty
                  : "Beginner",
              timeCommitment:
                typeof project.timeCommitment === "string" ? project.timeCommitment : "Not specified",
              deadline: typeof project.deadline === "string" ? project.deadline : "",
              status: project.status,
            }))
          );
        }
      }

      const savedApplications = window.localStorage.getItem(APPLICATION_STORAGE_KEY);
      if (savedApplications) {
        const parsed: unknown = JSON.parse(savedApplications);
        if (Array.isArray(parsed)) {
          setApplications(
            parsed
              .map((item, index) => normalizeApplication(item, index))
              .filter((item): item is MicroQuestApplication => item !== null)
          );
        }
      }
    } catch (error) {
      console.error("Could not load PROOFQUEST MicroQuests:", error);
      setSaveWarning("Some saved data could not be read. Check the browser console before changing or clearing stored data.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Persist every local change. This is independent of page refreshes.
  useEffect(() => {
    if (!hasLoaded) return;

    try {
      window.localStorage.setItem(MICROQUEST_STORAGE_KEY, JSON.stringify(quests));
      setSaveWarning("");
    } catch (error) {
      console.error("Could not save PROOFQUEST MicroQuests:", error);
      setSaveWarning("Your latest change could not be saved in this browser.");
    }
  }, [quests, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;

    try {
      window.localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(applications));
      setSaveWarning("");
    } catch (error) {
      console.error("Could not save PROOFQUEST applications:", error);
      setSaveWarning("Your application change could not be saved in this browser.");
    }
  }, [applications, hasLoaded]);

  // Keep records fresh if another browser tab changes quests or applications.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.newValue) return;

      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) return;

        if (event.key === MICROQUEST_STORAGE_KEY) {
          setQuests(
            parsed
              .map((item, index) => normalizeQuest(item, index))
              .filter((item): item is StoredMicroQuest => item !== null)
          );
        }

        if (event.key === APPLICATION_STORAGE_KEY) {
          setApplications(
            parsed
              .map((item, index) => normalizeApplication(item, index))
              .filter((item): item is MicroQuestApplication => item !== null)
          );
        }
      } catch (error) {
        console.warn("Could not sync PROOFQUEST records from another tab:", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const filteredQuests = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return quests.filter((quest) => {
      const searchableText = [
        quest.title,
        quest.description,
        quest.projectTitle,
        quest.organization,
        ...quest.skills,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchText);
      const matchesDifficulty = difficulty === "All levels" || quest.difficulty === difficulty;
      const matchesStatus = statusFilter === "All quests" || quest.status === statusFilter;

      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }, [quests, search, difficulty, statusFilter]);

  const roleScopedQuests = user?.role === "organization"
    ? filteredQuests.filter((quest) => quest.organization.trim().toLowerCase() === (user.organizationName ?? user.name).trim().toLowerCase())
    : filteredQuests;
  const ownerProjects = user?.role === "organization"
    ? approvedProjects.filter((project) => project.organization.trim().toLowerCase() === (user.organizationName ?? user.name).trim().toLowerCase())
    : approvedProjects;

  const openCount = quests.filter((quest) => quest.status === "Open").length;
  const generatedCount = quests.filter((quest) => quest.source === "project-intelligence").length;
  const manualCount = quests.filter((quest) => quest.source === "manual").length;

  const handleCreateQuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission(user?.role, "microquest:create")) { window.alert("Your role cannot create MicroQuests."); return; }

    const project = approvedProjects.find((item) => item.id === form.projectId);
    if (!project || (user?.role === "organization" && project.organization.trim().toLowerCase() !== (user.organizationName ?? user.name).trim().toLowerCase())) {
      window.alert("Choose an approved project before creating a MicroQuest.");
      return;
    }

    const newQuest: StoredMicroQuest = {
      id: `microquest-manual-${Date.now()}`,
      projectId: project.id,
      projectTitle: project.title,
      project: project.title,
      organization: project.organization,
      title: form.title.trim(),
      description: form.description.trim(),
      skills: form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      difficulty: form.difficulty,
      estimatedTime: form.estimatedTime,
      timeCommitment: form.estimatedTime,
      deadline: form.deadline || project.deadline,
      deliverable: form.deliverable.trim(),
      status: "Open",
      source: "manual",
      createdAt: new Date().toISOString(),
    };

    setQuests((current) => [newQuest, ...current]);
    setForm(emptyForm);
    setShowCreate(false);
    setExpandedId(newQuest.id);
  };

  const updateQuestStatus = (questId: string, nextStatus: QuestStatus) => {
    const targetQuest = quests.find((quest) => quest.id === questId);
    if (!targetQuest || !canManageQuest(targetQuest)) { window.alert("Only the project owner can update this MicroQuest."); return; }
    setQuests((current) =>
      current.map((quest) =>
        quest.id === questId ? { ...quest, status: nextStatus } : quest
      )
    );
  };

  const selectedProject = approvedProjects.find((project) => project.id === form.projectId);

  const handleJoinRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission(user?.role, "microquest:apply")) { window.alert("Only student accounts can request to join MicroQuests."); return; }
    if (!joiningQuest) return;

    const studentName = applicationForm.studentName.trim();
    const message = applicationForm.message.trim();

    if (!studentName) {
      window.alert("Enter your name before submitting the request.");
      return;
    }

    const alreadyApplied = applications.some(
      (application) =>
        application.questId === joiningQuest.id &&
        application.studentName.trim().toLowerCase() === studentName.toLowerCase()
    );

    if (alreadyApplied) {
      window.alert("A request from this name already exists for this MicroQuest.");
      return;
    }

    const newApplication: MicroQuestApplication = {
      id: `application-${Date.now()}`,
      questId: joiningQuest.id,
      questTitle: joiningQuest.title,
      projectId: joiningQuest.projectId,
      projectTitle: joiningQuest.projectTitle || joiningQuest.project,
      organization: joiningQuest.organization,
      studentName,
      message,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    setApplications((current) => [newApplication, ...current]);
    setJoiningQuest(null);
    setApplicationForm({ studentName: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0F16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">
              PQ
            </div>
            <div>
              <p className="font-semibold tracking-wide">PROOFQUEST</p>
              <p className="text-xs text-slate-500">Open innovation platform</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/applications"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              Review requests
            </Link>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <ArrowLeft size={16} /> Challenge Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
              <Sparkles size={16} /> Small tasks. Real contributions.
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              MicroQuests<span className="text-cyan-400">.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Explore focused pieces of approved projects. Pick a task that matches your skills,
              understand its expected deliverable and see how it contributes to the bigger solution.
            </p>
          </div>

          {hasPermission(user?.role, "microquest:create") && <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={approvedProjects.length === 0}
            title={approvedProjects.length === 0 ? "An approved project is needed first" : "Create a MicroQuest manually"}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} /> Create MicroQuest
          </button>}
        </div>

        {saveWarning && (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
            {saveWarning}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between text-slate-400">
              <p className="text-sm">Published quests</p>
              <ListTodo size={19} className="text-cyan-300" />
            </div>
            <p className="text-3xl font-semibold tabular-nums">{quests.length}</p>
            <p className="mt-1 text-xs text-slate-500">Accepted or manually created</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between text-slate-400">
              <p className="text-sm">Open quests</p>
              <CheckCircle2 size={19} className="text-emerald-300" />
            </div>
            <p className="text-3xl font-semibold tabular-nums">{openCount}</p>
            <p className="mt-1 text-xs text-slate-500">Available for discovery</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between text-slate-400">
              <p className="text-sm">Suggested by system</p>
              <Sparkles size={19} className="text-cyan-300" />
            </div>
            <p className="text-3xl font-semibold tabular-nums">{generatedCount}</p>
            <p className="mt-1 text-xs text-slate-500">Accepted Project Intelligence drafts</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between text-slate-400">
              <p className="text-sm">Created manually</p>
              <Plus size={19} className="text-cyan-300" />
            </div>
            <p className="text-3xl font-semibold tabular-nums">{manualCount}</p>
            <p className="mt-1 text-xs text-slate-500">Added by a project owner</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#0D121B] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quests, projects, organizations or skills..."
                className="w-full rounded-xl border border-white/10 bg-[#080B10] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
              />
            </div>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-400/60"
            >
              <option>All levels</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-400/60"
            >
              <option>All quests</option>
              <option>Open</option>
              <option>Paused</option>
              <option>Completed</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} /> Showing {roleScopedQuests.length} of {quests.length} quests
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Explore MicroQuests</h2>
            <span className="text-xs text-slate-500">Linked to approved projects</span>
          </div>

          {!hasLoaded ? (
            <div className="rounded-2xl border border-white/10 bg-[#0D121B] px-5 py-16 text-center text-sm text-slate-400">
              Loading saved MicroQuests...
            </div>
          ) : roleScopedQuests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#0D121B] px-5 py-16 text-center">
              <ListTodo size={30} className="mx-auto mb-3 text-slate-500" />
              <h3 className="font-semibold">{quests.length === 0 ? "No MicroQuests published yet" : "No matching MicroQuests"}</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                {quests.length === 0
                  ? "Once a university-approved project has its suggestions accepted in the Challenge Hub, those MicroQuests will appear here. Project owners can also create a task manually."
                  : "Try another search term or change your filters to find a matching task."}
              </p>
              {quests.length === 0 ? (
                <Link
                  href="/challenges"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2.5 text-sm text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  Open Challenge Hub <ArrowUpRight size={15} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDifficulty("All levels");
                    setStatusFilter("All quests");
                  }}
                  className="mt-5 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {roleScopedQuests.map((quest) => {
                const isExpanded = expandedId === quest.id;
                const statusStyle =
                  quest.status === "Completed"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : quest.status === "Paused"
                      ? "bg-amber-400/10 text-amber-200"
                      : "bg-cyan-400/10 text-cyan-300";

                return (
                  <article key={quest.id} className="flex flex-col rounded-2xl border border-white/10 bg-[#0D121B] p-5 transition hover:border-cyan-400/30">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                        {quest.source === "project-intelligence" ? "Project Intelligence" : quest.source === "manual" ? "Manual quest" : "Published quest"}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs ${statusStyle}`}>{quest.status}</span>
                    </div>

                    <h3 className="text-lg font-semibold leading-snug">{quest.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Building2 size={14} /> {quest.organization || "Organization not specified"}
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">{quest.description}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {quest.skills.length > 0 ? (
                        quest.skills.map((skill, index) => (
                          <span key={`${skill}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No specific skills listed</span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                      <div>
                        <p className="mb-1 text-xs text-slate-500">Difficulty</p>
                        <p className="text-sm text-slate-200">{quest.difficulty}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-slate-500">Time commitment</p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-200">
                          <Clock3 size={14} className="text-cyan-300" /> {quest.estimatedTime || quest.timeCommitment || "Not specified"}
                        </p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-[#080B10] p-4">
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">Parent project</p>
                          <p className="text-sm text-slate-200">{quest.projectTitle || quest.project || "Independent project"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">Expected deliverable</p>
                          <p className="text-sm leading-6 text-slate-300">{quest.deliverable}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <CalendarDays size={14} /> Deadline: {formatDate(quest.deadline)}
                        </div>
                        {canManageQuest(quest) && <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                          {quest.status !== "Paused" && quest.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => updateQuestStatus(quest.id, "Paused")}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-amber-400/30 hover:text-amber-200"
                            >
                              Pause listing
                            </button>
                          )}
                          {quest.status === "Paused" && (
                            <button
                              type="button"
                              onClick={() => updateQuestStatus(quest.id, "Open")}
                              className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10"
                            >
                              Reopen listing
                            </button>
                          )}
                          {quest.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => updateQuestStatus(quest.id, "Completed")}
                              className="rounded-lg border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-400/10"
                            >
                              Mark completed
                            </button>
                          )}
                          {quest.status === "Completed" && (
                            <button
                              type="button"
                              onClick={() => updateQuestStatus(quest.id, "Open")}
                              className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10"
                            >
                              Reopen quest
                            </button>
                          )}
                        </div>}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users size={14} />
                        {applications.filter((application) => application.questId === quest.id).length} request(s)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {quest.status === "Open" && hasPermission(user?.role, "microquest:apply") && (
                          <button
                            type="button"
                            onClick={() => {
                              setJoiningQuest(quest);
                              setApplicationForm({ studentName: user?.name ?? "", message: "" });
                            }}
                            className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Request to join
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : quest.id)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {joiningQuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0D121B] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm text-cyan-300"><Users size={16} /> Student participation</p>
                <h2 className="mt-2 text-xl font-semibold">Request to join</h2>
                <p className="mt-1 text-sm text-slate-400">{joiningQuest.title}</p>
                <p className="mt-1 text-xs text-slate-500">{joiningQuest.projectTitle || joiningQuest.project} · {joiningQuest.organization}</p>
              </div>
              <button type="button" onClick={() => setJoiningQuest(null)} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:text-white" aria-label="Close request form">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinRequest} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Your name
                <input
                  required
                  maxLength={80}
                  value={applicationForm.studentName}
                  readOnly={user?.role === "student"}
                  onChange={(event) => setApplicationForm((current) => ({ ...current, studentName: event.target.value }))}
                  placeholder="Enter your name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Why are you interested? <span className="text-slate-500">(optional)</span>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={applicationForm.message}
                  onChange={(event) => setApplicationForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Mention relevant skills, what you hope to contribute, or questions for the project owner..."
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </label>
              <p className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-xs leading-5 text-amber-100/80">
                Prototype note: this request is saved in this browser only. Real multi-user applications will be connected to accounts and the database later.
              </p>
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button type="button" onClick={() => setJoiningQuest(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5">Cancel</button>
                <button type="submit" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Submit request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0D121B] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm text-cyan-300"><Plus size={16} /> Manual task creation</p>
                <h2 className="mt-2 text-xl font-semibold">Create a MicroQuest</h2>
                <p className="mt-1 text-sm text-slate-500">Add a focused task to an already approved project.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:text-white" aria-label="Close form">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Approved project
                <select
                  required
                  value={form.projectId}
                  onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                >
                  <option value="">Select a project</option>
                  {ownerProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title} — {project.organization}</option>
                  ))}
                </select>
              </label>

              {selectedProject && (
                <p className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-2 text-xs text-cyan-200">
                  Linked to {selectedProject.title}. Project deadline: {formatDate(selectedProject.deadline)}.
                </p>
              )}

              <label className="block text-sm text-slate-300">
                MicroQuest title
                <input required maxLength={100} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Design the project landing page" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>

              <label className="block text-sm text-slate-300">
                Description
                <textarea required rows={3} maxLength={1200} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain the task and what the contributor needs to do..." className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Required skills
                  <input value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="React, CSS, UI/UX" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
                </label>
                <label className="block text-sm text-slate-300">
                  Difficulty
                  <select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Estimated time
                  <input required value={form.estimatedTime} onChange={(event) => setForm((current) => ({ ...current, estimatedTime: event.target.value }))} placeholder="e.g. 3–5 hours" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
                </label>
                <label className="block text-sm text-slate-300">
                  Deadline (optional)
                  <input type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60" />
                </label>
              </div>

              <label className="block text-sm text-slate-300">
                Expected deliverable
                <textarea required rows={2} maxLength={600} value={form.deliverable} onChange={(event) => setForm((current) => ({ ...current, deliverable: event.target.value }))} placeholder="What must the contributor submit to complete this task?" className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5">Cancel</button>
                <button type="submit" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Publish MicroQuest</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
