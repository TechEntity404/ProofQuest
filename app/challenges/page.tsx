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
  Check,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type ChallengeStatus = "Open" | "Pending review" | "Rejected";
type ProjectMode = "Direct" | "Structured" | "Collaborative";

type SuggestionStatus = "suggested" | "accepted" | "discarded";

type MicroQuestSuggestion = {
  id?: string;
  title: string;
  description: string;
  skills: string[];
  deliverable: string;
  status?: SuggestionStatus;
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
  status: "Open";
  source: "project-intelligence";
  sourceSuggestionId: string;
  createdAt: string;
};

type ProjectAnalysis = {
  mode: ProjectMode;
  reason: string;
  signals: string[];
  suggestedMicroQuests: MicroQuestSuggestion[];
};

type NormalizedMicroQuestSuggestion = MicroQuestSuggestion & { id: string };
type NormalizedProjectAnalysis = Omit<ProjectAnalysis, "suggestedMicroQuests"> & {
  suggestedMicroQuests: NormalizedMicroQuestSuggestion[];
};

type ProjectApplicationStatus = "Pending" | "Accepted" | "Declined";

type ProjectApplication = {
  id: string;
  projectId: string;
  projectTitle: string;
  organization: string;
  studentName: string;
  message: string;
  status: ProjectApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
};

type Challenge = {
  id: string;
  title: string;
  organization: string;
  category: string;
  description: string;
  skills: string[];
  difficulty: Difficulty;
  timeCommitment: string;
  deadline: string;
  deliverable: string;
  status: ChallengeStatus;
  reviewNote?: string;
  // Optional so projects saved by older versions remain compatible.
  projectAnalysis?: ProjectAnalysis;
};

const STORAGE_KEY = "proofquest_challenges_v1";
const MICROQUEST_STORAGE_KEY = "proofquest_microquests_v1";
const PROJECT_APPLICATION_STORAGE_KEY = "proofquest_project_applications_v1";

const initialChallenges: Challenge[] = [
  {
    id: "demo-1",
    title: "NGO Education Website",
    organization: "BrightSteps Foundation",
    category: "Education",
    description:
      "Help a community education initiative create a simple, accessible website to explain its work and share learning resources.",
    skills: ["HTML", "CSS", "JavaScript", "UI/UX"],
    difficulty: "Beginner",
    timeCommitment: "1–2 weeks",
    deadline: "2026-12-08",
    deliverable: "A responsive website prototype with a homepage and resources section.",
    status: "Open",
  },
  {
    id: "demo-2",
    title: "Small Business Inventory Tool",
    organization: "CornerCart Retail",
    category: "Technology",
    description:
      "Explore a lightweight way for a small shop to record products and keep track of basic stock information.",
    skills: ["React", "JavaScript", "UI/UX"],
    difficulty: "Intermediate",
    timeCommitment: "2–4 weeks",
    deadline: "2026-12-15",
    deliverable: "A working inventory dashboard prototype with sample data.",
    status: "Open",
  },
  {
    id: "demo-3",
    title: "Community Awareness Campaign",
    organization: "GreenNeighbour Network",
    category: "Sustainability",
    description:
      "Create a digital awareness resource that helps residents understand local waste-separation practices.",
    skills: ["Content", "Graphic Design", "Web Design"],
    difficulty: "Beginner",
    timeCommitment: "2–4 hours",
    deadline: "2026-11-30",
    deliverable: "A shareable digital campaign page or information poster.",
    status: "Open",
  },
];

const categories = [
  "All categories",
  "Technology",
  "Education",
  "Sustainability",
  "Healthcare",
  "Community",
];

const difficulties: Difficulty[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

const emptyForm = {
  title: "",
  organization: "",
  category: "Technology",
  description: "",
  skills: "",
  difficulty: "Beginner" as Difficulty,
  timeCommitment: "1–2 weeks",
  deadline: "",
  deliverable: "",
};

type FormState = typeof emptyForm;

function formatDeadline(date: string) {
  if (!date) return "Not specified";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


/**
 * Analyses only the project details the organization already enters.
 * This is a transparent rule-based prototype, not an AI model.
 */
function analyseProject(challenge: Challenge): ProjectAnalysis {
  const fullText = [
    challenge.title,
    challenge.description,
    challenge.deliverable,
  ]
    .join(" ")
    .toLowerCase();

  const complexityPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Multiple features or modules", pattern: /\b(multiple|several|multi[- ]module|modules|features|workflows)\b/i },
    { label: "Platform or system scope", pattern: /\b(platform|portal|end[- ]to[- ]end system|management system)\b/i },
    { label: "Data or integration work", pattern: /\b(api|database|integration|data sync|analytics|reporting|inventory|stock management)\b/i },
    { label: "Automation or real-time functionality", pattern: /\b(automation|automated|real[- ]time|authentication|payment gateway|role[- ]based access)\b/i },
    { label: "Dashboard or application workflow", pattern: /\b(dashboard|application workflow|admin panel|user accounts)\b/i },
  ];

  const detectedComplexity = complexityPatterns
    .filter((item) => item.pattern.test(fullText))
    .map((item) => item.label);

  const skillText = challenge.skills.join(" ").toLowerCase();
  const skillGroups = [
    {
      name: "Design and content",
      pattern: /ui\/?ux|design|figma|graphic|content|writing|research|copywriting/i,
    },
    {
      name: "Frontend development",
      pattern: /html|css|javascript|typescript|react|next\.?js|frontend|front-end|web development/i,
    },
    {
      name: "Backend and data",
      pattern: /python|java|node|fastapi|backend|back-end|sql|database|supabase|php|django|flask|machine learning|ai\/?ml|data/i,
    },
    {
      name: "Security and quality",
      pattern: /cyber|security|testing|qa|quality assurance|devops|cloud|network|linux/i,
    },
    {
      name: "Hardware and embedded systems",
      pattern: /iot|robotics|arduino|embedded|electronics|hardware/i,
    },
  ].filter((group) => group.pattern.test(skillText));

  const durationScore =
    challenge.timeCommitment === "1–2 months"
      ? 3
      : challenge.timeCommitment === "2–4 weeks"
        ? 2
        : challenge.timeCommitment === "1–2 weeks"
          ? 1
          : 0;

  const deliverableParts = challenge.deliverable
    .split(/,|;|\band\b|\bplus\b|\balong with\b/i)
    .map((part) => part.trim())
    .filter(Boolean).length;

  const deliverablePartsScore = deliverableParts >= 3 ? 2 : deliverableParts === 2 ? 1 : 0;
  const simpleDeliverable = /\b(poster|infographic|brochure|logo|single[- ]page|one[- ]page|landing page|awareness resource|campaign page|social media post|presentation)\b/i.test(fullText);

  const score =
    detectedComplexity.length * 2 +
    (skillGroups.length >= 3 ? 2 : skillGroups.length === 2 ? 1 : 0) +
    durationScore +
    deliverablePartsScore +
    (challenge.difficulty === "Advanced" ? 1 : 0);

  let mode: ProjectMode;
  if (simpleDeliverable && detectedComplexity.length < 2 && skillGroups.length <= 2 && durationScore <= 1) {
    mode = "Direct";
  } else if (score >= 8) {
    mode = "Collaborative";
  } else if (score >= 3) {
    mode = "Structured";
  } else {
    mode = "Direct";
  }

  const signals: string[] = [...detectedComplexity];
  if (skillGroups.length > 1) {
    signals.push(`${skillGroups.length} different skill areas`);
  }
  if (durationScore >= 2) {
    signals.push("Longer estimated timeline");
  }
  if (deliverableParts >= 2) {
    signals.push("More than one deliverable element");
  }
  if (signals.length === 0) {
    signals.push("One focused deliverable");
  }

  let reason: string;
  if (mode === "Collaborative") {
    reason =
      "This project appears to combine several functional areas or complex components. Breaking the work into smaller MicroQuests could help multiple contributors work in parallel.";
  } else if (mode === "Structured") {
    reason =
      "This project has a few connected parts. A small, optional set of MicroQuests could make responsibilities and progress easier to manage.";
  } else {
    reason =
      "This looks like one focused deliverable. Students can work on it as a single project, so separate MicroQuests are probably unnecessary.";
  }

  const suggestedMicroQuests: MicroQuestSuggestion[] = [];
  if (mode !== "Direct") {
    const hasDesignSkills = /ui\/?ux|design|figma|graphic|content|writing|research/i.test(skillText);
    const hasFrontendSkills = /html|css|javascript|typescript|react|next\.?js|frontend|front-end|web development/i.test(skillText);
    const hasBackendSkills = /python|java|node|fastapi|backend|back-end|sql|database|supabase|php|django|flask|machine learning|ai\/?ml|data/i.test(skillText) || /api|database|inventory|stock|records|data/i.test(fullText);
    const hasQualitySkills = /cyber|security|testing|qa|quality assurance|devops|cloud|network|linux/i.test(skillText);
    const hasHardwareSkills = /iot|robotics|arduino|embedded|electronics|hardware/i.test(skillText);

    if (hasDesignSkills) {
      suggestedMicroQuests.push({
        title: "Plan the experience and content",
        description: `Define the key user needs, structure and design direction for ${challenge.title}.`,
        skills: challenge.skills.filter((skill) => /ui\/?ux|design|figma|graphic|content|writing|research/i.test(skill)),
        deliverable: "A reviewed outline, wireframe or content/design draft.",
      });
    }
    if (hasFrontendSkills) {
      suggestedMicroQuests.push({
        title: "Build the user-facing experience",
        description: `Create the interface or user-facing part of ${challenge.title} based on the agreed requirements.`,
        skills: challenge.skills.filter((skill) => /html|css|javascript|typescript|react|next\.?js|frontend|front-end|web development/i.test(skill)),
        deliverable: "A working user interface or front-end prototype.",
      });
    }
    if (hasBackendSkills) {
      suggestedMicroQuests.push({
        title: "Implement data and core functionality",
        description: `Build the data handling, integrations or core logic needed for ${challenge.title}.`,
        skills: challenge.skills.filter((skill) => /python|java|node|fastapi|backend|back-end|sql|database|supabase|php|django|flask|machine learning|ai\/?ml|data/i.test(skill)),
        deliverable: "A working core feature with sample or test data.",
      });
    }
    if (hasHardwareSkills) {
      suggestedMicroQuests.push({
        title: "Develop the hardware component",
        description: `Build and connect the hardware or embedded component required for ${challenge.title}.`,
        skills: challenge.skills.filter((skill) => /iot|robotics|arduino|embedded|electronics|hardware/i.test(skill)),
        deliverable: "A tested hardware or embedded-system prototype.",
      });
    }
    if (hasQualitySkills || mode === "Collaborative") {
      suggestedMicroQuests.push({
        title: "Test and validate the solution",
        description: "Check the main user flows, verify expected results and document issues that need fixing.",
        skills: challenge.skills.filter((skill) => /cyber|security|testing|qa|quality assurance|devops|cloud|network|linux/i.test(skill)),
        deliverable: "A test summary with issues found and fixes verified.",
      });
    }

    // Keep suggestions proportional to project size; they remain drafts, not tasks.
    const maximumSuggestions = mode === "Collaborative" ? 4 : 3;
    suggestedMicroQuests.splice(maximumSuggestions);

    if (suggestedMicroQuests.length === 1) {
      suggestedMicroQuests.push({
        title: "Review and prepare the final deliverable",
        description: "Bring the work together, check it against the project brief and prepare it for submission.",
        skills: [],
        deliverable: challenge.deliverable,
      });
    }
  }

  return {
    mode,
    reason,
    signals,
    suggestedMicroQuests: suggestedMicroQuests.map((quest, index) => ({
      ...quest,
      id: `${challenge.id}-suggestion-${index + 1}`,
      status: "suggested" as const,
    })),
  };
}

function getProjectAnalysis(challenge: Challenge): NormalizedProjectAnalysis {
  const analysis = challenge.projectAnalysis ?? analyseProject(challenge);

  // Add stable IDs/status to older suggestions saved before this workflow existed.
  return {
    ...analysis,
    suggestedMicroQuests: analysis.suggestedMicroQuests.map((quest, index) => ({
      ...quest,
      id: quest.id || `${challenge.id}-suggestion-${index + 1}`,
      status: quest.status ?? "suggested",
    })),
  };
}

function saveAcceptedMicroQuests(
  challenge: Challenge,
  suggestions: NormalizedMicroQuestSuggestion[]
) {
  const raw = window.localStorage.getItem(MICROQUEST_STORAGE_KEY);
  let existing: StoredMicroQuest[] = [];

  if (raw) {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("The saved MicroQuests data is not a valid list.");
    }
    existing = parsed as StoredMicroQuest[];
  }

  const existingSuggestionIds = new Set(
    existing.map((quest) => quest.sourceSuggestionId).filter(Boolean)
  );
  const timestamp = Date.now();
  const newQuests: StoredMicroQuest[] = suggestions
    .filter((suggestion) => !existingSuggestionIds.has(suggestion.id))
    .map((suggestion, index) => ({
      id: `microquest-${timestamp}-${index}`,
      projectId: challenge.id,
      projectTitle: challenge.title,
      project: challenge.title,
      organization: challenge.organization,
      title: suggestion.title,
      description: suggestion.description,
      skills: suggestion.skills,
      difficulty: challenge.difficulty,
      estimatedTime: challenge.timeCommitment,
      timeCommitment: challenge.timeCommitment,
      deadline: challenge.deadline,
      deliverable: suggestion.deliverable,
      status: "Open",
      source: "project-intelligence",
      sourceSuggestionId: suggestion.id,
      createdAt: new Date().toISOString(),
    }));

  window.localStorage.setItem(
    MICROQUEST_STORAGE_KEY,
    JSON.stringify([...existing, ...newQuests])
  );
}

export default function ChallengesPage() {
  const { user } = useProofQuestAuth();
  const canManageChallenge = (challenge: Challenge) =>
    user?.role === "admin" ||
    (user?.role === "organization" && challenge.organization.trim().toLowerCase() === (user.organizationName ?? "").trim().toLowerCase());
  const [challenges, setChallenges] =
    useState<Challenge[]>(initialChallenges);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [projectApplications, setProjectApplications] = useState<ProjectApplication[]>([]);
  const [applicationProject, setApplicationProject] = useState<Challenge | null>(null);
  const [projectApplicationForm, setProjectApplicationForm] = useState({ studentName: "", message: "" });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [difficulty, setDifficulty] = useState("All levels");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingSuggestion, setEditingSuggestion] = useState<{
    challengeId: string;
    suggestionId: string;
    draft: MicroQuestSuggestion;
  } | null>(null);

  // Load saved projects from this browser.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setChallenges(parsed as Challenge[]);
        }
      }

      const savedApplications = window.localStorage.getItem(PROJECT_APPLICATION_STORAGE_KEY);
      if (savedApplications) {
        const parsedApps: unknown = JSON.parse(savedApplications);
        if (Array.isArray(parsedApps)) {
          setProjectApplications(parsedApps.filter((item): item is ProjectApplication =>
            typeof item === "object" && item !== null &&
            typeof (item as ProjectApplication).id === "string" &&
            typeof (item as ProjectApplication).projectId === "string" &&
            typeof (item as ProjectApplication).studentName === "string"
          ));
        }
      }
    } catch {
      console.warn("Could not load saved PROOFQUEST projects.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Save projects whenever the list changes.
  useEffect(() => {
    if (!hasLoaded) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(challenges)
      );
    } catch {
      console.warn("Could not save PROOFQUEST projects.");
    }
  }, [challenges, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      window.localStorage.setItem(PROJECT_APPLICATION_STORAGE_KEY, JSON.stringify(projectApplications));
    } catch (error) {
      console.error("Could not save PROOFQUEST project applications:", error);
    }
  }, [projectApplications, hasLoaded]);

  // Apply the search and filters.
  const filteredChallenges = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return challenges.filter((challenge) => {
      const matchesSearch = [
        challenge.title,
        challenge.organization,
        challenge.description,
        ...challenge.skills,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchText);

      const matchesCategory =
        category === "All categories" ||
        challenge.category === category;

      const matchesDifficulty =
        difficulty === "All levels" ||
        challenge.difficulty === difficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [challenges, search, category, difficulty]);

  const openCount = challenges.filter(
    (challenge) => challenge.status === "Open"
  ).length;

  const handleCreateChallenge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission(user?.role, "challenge:create")) { window.alert("Your role cannot publish challenges."); return; }

    const challengeDetails: Challenge = {
      id: `project-${Date.now()}`,
      title: form.title.trim(),
      organization: form.organization.trim(),
      category: form.category,
      description: form.description.trim(),
      skills: form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      difficulty: form.difficulty,
      timeCommitment: form.timeCommitment,
      deadline: form.deadline,
      deliverable: form.deliverable.trim(),
      status: "Pending review",
    };

    // Analyse the existing form details automatically; no extra mode questions.
    const rawAnalysis = analyseProject(challengeDetails);
    const newChallenge: Challenge = {
      ...challengeDetails,
      projectAnalysis: {
        ...rawAnalysis,
        suggestedMicroQuests: rawAnalysis.suggestedMicroQuests.map((quest, index) => ({
          ...quest,
          id: `${challengeDetails.id}-suggestion-${index + 1}`,
          status: "suggested" as const,
        })),
      },
    };

    setChallenges((current) => [newChallenge, ...current]);
    setForm(emptyForm);
    setShowCreate(false);
    setExpandedId(newChallenge.id);
  };

  const handleProjectApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission(user?.role, "challenge:apply")) { window.alert("Only student accounts can apply to projects."); return; }
    if (!applicationProject) return;

    const studentName = projectApplicationForm.studentName.trim();
    const message = projectApplicationForm.message.trim();
    if (!studentName) return;

    const duplicate = projectApplications.some((application) =>
      application.projectId === applicationProject.id &&
      application.studentName.trim().toLowerCase() === studentName.toLowerCase() &&
      application.status !== "Declined"
    );

    if (duplicate) {
      window.alert("You already have an active application for this project.");
      return;
    }

    const newApplication: ProjectApplication = {
      id: `project-application-${Date.now()}`,
      projectId: applicationProject.id,
      projectTitle: applicationProject.title,
      organization: applicationProject.organization,
      studentName,
      message,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    setProjectApplications((current) => [newApplication, ...current]);
    setApplicationProject(null);
    setProjectApplicationForm({ studentName: "", message: "" });
    window.alert("Your project application has been submitted.");
  };

  const updateSuggestion = (
    challengeId: string,
    suggestionId: string,
    updates: Partial<MicroQuestSuggestion>
  ) => {
    setChallenges((current) =>
      current.map((challenge) => {
        if (challenge.id !== challengeId) return challenge;

        const analysis = getProjectAnalysis(challenge);
        return {
          ...challenge,
          projectAnalysis: {
            ...analysis,
            suggestedMicroQuests: analysis.suggestedMicroQuests.map((quest) =>
              quest.id === suggestionId ? { ...quest, ...updates } : quest
            ),
          },
        };
      })
    );
  };

  const acceptSuggestions = (challenge: Challenge, selected: NormalizedMicroQuestSuggestion[]) => {
    if (challenge.status !== "Open") {
      window.alert("This project must be approved by the university before MicroQuests can be published.");
      return;
    }

    const pending = selected.filter((quest) => (quest.status ?? "suggested") === "suggested");
    if (pending.length === 0) return;

    try {
      saveAcceptedMicroQuests(challenge, pending);
      setChallenges((current) =>
        current.map((item) => {
          if (item.id !== challenge.id) return item;
          const analysis = getProjectAnalysis(item);
          return {
            ...item,
            projectAnalysis: {
              ...analysis,
              suggestedMicroQuests: analysis.suggestedMicroQuests.map((quest) =>
                pending.some((accepted) => accepted.id === quest.id)
                  ? { ...quest, status: "accepted" as const }
                  : quest
              ),
            },
          };
        })
      );
    } catch (error) {
      console.error("Could not publish MicroQuest suggestions:", error);
      window.alert("Could not save MicroQuests. Your existing saved data has been left unchanged. Please check browser storage and try again.");
    }
  };

  const discardSuggestion = (challengeId: string, suggestionId: string) => {
    updateSuggestion(challengeId, suggestionId, { status: "discarded" });
    if (editingSuggestion?.suggestionId === suggestionId) {
      setEditingSuggestion(null);
    }
  };

  const saveSuggestionEdit = () => {
    if (!editingSuggestion) return;

    const { challengeId, suggestionId, draft } = editingSuggestion;
    if (!draft.title.trim() || !draft.description.trim() || !draft.deliverable.trim()) {
      window.alert("Please complete the title, description and deliverable before saving.");
      return;
    }

    updateSuggestion(challengeId, suggestionId, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      skills: draft.skills.map((skill) => skill.trim()).filter(Boolean),
      deliverable: draft.deliverable.trim(),
    });
    setEditingSuggestion(null);
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      {/* Top navigation */}
      <header className="border-b border-white/10 bg-[#0B0F16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">
              PQ
            </div>

            <div>
              <p className="font-semibold tracking-wide">PROOFQUEST</p>
              <p className="text-xs text-slate-500">
                Open innovation platform
              </p>
            </div>
          </Link>

          <Link
            href="/approvals"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            Coordinator Review
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* Page heading */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
              <Sparkles size={16} />
              Discover opportunities
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Challenge Hub<span className="text-cyan-400">.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Find real-world projects, explore new skills and turn what
              you learn into meaningful contributions.
            </p>
          </div>

          {hasPermission(user?.role, "challenge:create") && (
            <button
              onClick={() => { setForm({ ...emptyForm, organization: user?.organizationName ?? "" }); setShowCreate(true); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Plus size={18} />
              Publish a project
            </button>
          )}
        </div>

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Available projects</p>
              <BriefcaseIcon />
            </div>
            <p className="text-3xl font-semibold">{openCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              Ready for student discovery
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">All submissions</p>
              <Building2 size={19} className="text-cyan-300" />
            </div>
            <p className="text-3xl font-semibold">{challenges.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              Including projects awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D121B] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Your platform</p>
              <GraduationCap size={20} className="text-cyan-300" />
            </div>
            <p className="text-lg font-semibold">Learn by contributing</p>
            <p className="mt-1 text-xs text-slate-500">
              Discover. Collaborate. Deliver.
            </p>
          </div>
        </section>

        {/* Search and filters */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-[#0D121B] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_210px_180px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects, organizations or skills..."
                className="w-full rounded-xl border border-white/10 bg-[#080B10] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
              />
            </div>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-400/60"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-400/60"
            >
              <option value="All levels">All levels</option>
              {difficulties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} />
            Showing {filteredChallenges.length} of {challenges.length} projects
          </div>
        </section>

        {/* Project cards */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Explore projects</h2>
            <span className="text-xs text-slate-500">
              Demo opportunities
            </span>
          </div>

          {filteredChallenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#0D121B] px-5 py-16 text-center">
              <Search className="mx-auto mb-3 text-slate-500" size={28} />
              <h3 className="font-semibold">No matching projects</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or change your filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All categories");
                  setDifficulty("All levels");
                }}
                className="mt-4 text-sm text-cyan-300 hover:text-cyan-200"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {filteredChallenges.map((challenge) => {
                const isExpanded = expandedId === challenge.id;

                return (
                  <article
                    key={challenge.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-[#0D121B] p-5 transition hover:border-cyan-400/30"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                        {challenge.category}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${challenge.status === "Open"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : challenge.status === "Rejected"
                            ? "bg-red-400/10 text-red-300"
                            : "bg-amber-400/10 text-amber-300"
                          }`}
                      >
                        {challenge.status === "Pending review"
                          ? "Awaiting approval"
                          : challenge.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold leading-snug">
                      {challenge.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Building2 size={14} />
                      {challenge.organization}
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">
                      {challenge.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {challenge.skills.map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                      <div>
                        <p className="mb-1 text-xs text-slate-500">
                          Difficulty
                        </p>
                        <p className="text-sm text-slate-200">
                          {challenge.difficulty}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-slate-500">
                          Time commitment
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-200">
                          <Clock3 size={14} className="text-cyan-300" />
                          {challenge.timeCommitment}
                        </p>
                      </div>
                    </div>

                    {isExpanded && (() => {
                      const analysis = getProjectAnalysis(challenge);
                      return (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                                <Sparkles size={14} /> Project Intelligence
                              </p>
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                {analysis.mode} workflow suggested
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {analysis.reason}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {analysis.signals.map((signal, index) => (
                                <span
                                  key={`${signal}-${index}`}
                                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-400"
                                >
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-[#080B10] p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                  Suggested MicroQuests
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Review the suggestions. Only accepted items become available in the MicroQuests hub.
                                </p>
                              </div>
                              {canManageChallenge(challenge) && analysis.suggestedMicroQuests.some((quest) => (quest.status ?? "suggested") === "suggested") && (
                                <button
                                  type="button"
                                  onClick={() => acceptSuggestions(challenge, analysis.suggestedMicroQuests)}
                                  disabled={challenge.status !== "Open"}
                                  className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={challenge.status !== "Open" ? "Available after university approval" : "Accept all suggestions"}
                                >
                                  Accept all suggestions
                                </button>
                              )}
                            </div>

                            {analysis.suggestedMicroQuests.filter((quest) => (quest.status ?? "suggested") !== "discarded").length === 0 ? (
                              <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
                                No active suggestions. This project can be completed as one focused deliverable, or you can add MicroQuests manually from the MicroQuests hub.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {analysis.suggestedMicroQuests.map((quest, index) => {
                                  const status = quest.status ?? "suggested";
                                  if (status === "discarded") return null;

                                  const isEditing = editingSuggestion?.challengeId === challenge.id && editingSuggestion.suggestionId === quest.id;

                                  return (
                                    <div key={quest.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                                      {isEditing && editingSuggestion ? (
                                        <div className="space-y-3">
                                          <label className="block text-xs text-slate-400">
                                            MicroQuest title
                                            <input
                                              value={editingSuggestion.draft.title}
                                              onChange={(event) => setEditingSuggestion({ ...editingSuggestion, draft: { ...editingSuggestion.draft, title: event.target.value } })}
                                              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                                            />
                                          </label>
                                          <label className="block text-xs text-slate-400">
                                            Description
                                            <textarea
                                              rows={2}
                                              value={editingSuggestion.draft.description}
                                              onChange={(event) => setEditingSuggestion({ ...editingSuggestion, draft: { ...editingSuggestion.draft, description: event.target.value } })}
                                              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-[#080B10] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                                            />
                                          </label>
                                          <label className="block text-xs text-slate-400">
                                            Required skills (comma-separated)
                                            <input
                                              value={editingSuggestion.draft.skills.join(", ")}
                                              onChange={(event) => setEditingSuggestion({ ...editingSuggestion, draft: { ...editingSuggestion.draft, skills: event.target.value.split(",") } })}
                                              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                                            />
                                          </label>
                                          <label className="block text-xs text-slate-400">
                                            Expected deliverable
                                            <textarea
                                              rows={2}
                                              value={editingSuggestion.draft.deliverable}
                                              onChange={(event) => setEditingSuggestion({ ...editingSuggestion, draft: { ...editingSuggestion.draft, deliverable: event.target.value } })}
                                              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-[#080B10] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                                            />
                                          </label>
                                          <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={saveSuggestionEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300">
                                              <Save size={14} /> Save changes
                                            </button>
                                            <button type="button" onClick={() => setEditingSuggestion(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-200">
                                              {index + 1}. {quest.title}
                                            </p>
                                            {status === "accepted" ? (
                                              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Added to MicroQuests</span>
                                            ) : (
                                              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200">Draft suggestion</span>
                                            )}
                                          </div>
                                          <p className="mt-1 text-xs leading-5 text-slate-400">{quest.description}</p>
                                          <p className="mt-2 text-xs text-slate-500">Deliverable: {quest.deliverable}</p>
                                          {quest.skills.length > 0 && (
                                            <p className="mt-2 text-xs text-cyan-300/80">Skills: {quest.skills.join(", ")}</p>
                                          )}
                                          {status === "suggested" && canManageChallenge(challenge) && (
                                            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                                              <button
                                                type="button"
                                                onClick={() => setEditingSuggestion({ challengeId: challenge.id, suggestionId: quest.id, draft: { ...quest, skills: [...quest.skills] } })}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"
                                              >
                                                <Pencil size={13} /> Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => acceptSuggestions(challenge, [quest])}
                                                disabled={challenge.status !== "Open"}
                                                title={challenge.status !== "Open" ? "Available after university approval" : "Accept this suggestion"}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                                              >
                                                <Check size={13} /> Accept
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => discardSuggestion(challenge.id, quest.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:border-red-400/30 hover:text-red-300"
                                              >
                                                <Trash2 size={13} /> Discard
                                              </button>
                                            </div>
                                          )}
                                          {status === "accepted" && (
                                            <Link href="/microquests" className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
                                              View in MicroQuests <ArrowUpRight size={13} />
                                            </Link>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {challenge.status !== "Open" && analysis.suggestedMicroQuests.some((quest) => (quest.status ?? "suggested") === "suggested") && (
                              <p className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-xs leading-5 text-amber-200">
                                Suggestions can be edited or discarded now. They can be published to the MicroQuests hub after university approval.
                              </p>
                            )}
                          </div>

                          <div className="rounded-xl border border-white/10 bg-[#080B10] p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                              Expected deliverable
                            </p>
                            <p className="text-sm leading-6 text-slate-300">
                              {challenge.deliverable}
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                              <CalendarDays size={14} />
                              Deadline: {formatDeadline(challenge.deadline)}
                            </div>
                          </div>

                          {challenge.status === "Pending review" && (
                            <p className="text-xs leading-5 text-amber-300">
                              This project is waiting for university approval before students can join.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="mt-5 space-y-2">
                      {challenge.status === "Open" && hasPermission(user?.role, "challenge:apply") && (
                        <button
                          type="button"
                          onClick={() => {
                            setApplicationProject(challenge);
                            setProjectApplicationForm({ studentName: user?.name ?? "", message: "" });
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                        >
                          Apply to project <ArrowUpRight size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                      >
                        {isExpanded ? "Hide details" : "View project details"}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs leading-5 text-slate-600">
          PROOFQUEST prototype · Sample project data is for demonstration only.
        </p>
      </main>

      {/* Apply directly to a project. This supports Direct projects that have no MicroQuests. */}
      {applicationProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0D121B] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-cyan-300">Student participation</p>
                <h2 className="mt-2 text-xl font-semibold">Apply to this project</h2>
                <p className="mt-1 text-sm text-slate-400">{applicationProject.title}</p>
                <p className="mt-1 text-xs text-slate-500">{applicationProject.organization}</p>
              </div>
              <button type="button" onClick={() => setApplicationProject(null)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Close application form"><X size={18} /></button>
            </div>
            <form onSubmit={handleProjectApplication} className="space-y-4">
              <label className="block text-sm text-slate-300">Your name
                <input required maxLength={80} value={projectApplicationForm.studentName} readOnly={user?.role === "student"} onChange={(event) => setProjectApplicationForm((current) => ({ ...current, studentName: event.target.value }))} placeholder="Enter your name" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>
              <label className="block text-sm text-slate-300">Why are you interested? <span className="text-slate-500">(optional)</span>
                <textarea rows={4} maxLength={500} value={projectApplicationForm.message} onChange={(event) => setProjectApplicationForm((current) => ({ ...current, message: event.target.value }))} placeholder="Share your relevant skills and what you hope to contribute..." className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>
              <p className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-xs leading-5 text-amber-100/80">This prototype stores applications in this browser only. Student identity is not verified yet.</p>
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button type="button" onClick={() => setApplicationProject(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
                <button type="submit" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Submit application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create project modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0D121B] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm text-cyan-300">
                  Organization workspace
                </p>
                <h2 className="text-2xl font-bold">Publish a project</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Share the problem and expected outcome. PROOFQUEST will analyse the details and suggest a suitable workflow automatically.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project title
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Example: Build a website for our NGO"
                  className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Organization name
                  </label>
                  <input
                    required
                    readOnly={user?.role === "organization"}
                    value={form.organization}
                    onChange={(event) =>
                      setForm({ ...form, organization: event.target.value })
                    }
                    placeholder="Your organization"
                    className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                  >
                    {categories
                      .filter((item) => item !== "All categories")
                      .map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Describe the problem
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="What problem does your organization need help solving?"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Expected student deliverable
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.deliverable}
                  onChange={(event) =>
                    setForm({ ...form, deliverable: event.target.value })
                  }
                  placeholder="What should the student or team submit?"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Required skills
                </label>
                <input
                  required
                  value={form.skills}
                  onChange={(event) =>
                    setForm({ ...form, skills: event.target.value })
                  }
                  placeholder="HTML, CSS, UI/UX (separate with commas)"
                  className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Difficulty
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        difficulty: event.target.value as Difficulty,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                  >
                    {difficulties.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Estimated time
                  </label>
                  <select
                    value={form.timeCommitment}
                    onChange={(event) =>
                      setForm({ ...form, timeCommitment: event.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                  >
                    <option>2–4 hours</option>
                    <option>1–2 weeks</option>
                    <option>2–4 weeks</option>
                    <option>1–2 months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Submission deadline
                </label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={form.deadline}
                  onChange={(event) =>
                    setForm({ ...form, deadline: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#080B10] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-5 text-amber-200">
                New projects are submitted for university review. They will
                not be marked as open opportunities until approved.
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <CheckCircle2 size={18} />
                Submit for university review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefcaseIcon() {
  return <Building2 size={19} className="text-cyan-300" />;
}