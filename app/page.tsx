"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, ShieldCheck } from "lucide-react";
import ProofQuestQuickLinks from "@/components/ProofQuestQuickLinks";
import ProofQuestDashboardStats from "@/components/ProofQuestDashboardStats";
import ProofQuestUserMenu from "@/components/ProofQuestUserMenu";

type DashboardChallenge = {
  id: string;
  title: string;
  organization: string;
  category: string;
  difficulty: string;
  status: string;
};

const STORAGE_KEY = "proofquest_challenges_v1";

const sampleProjects: DashboardChallenge[] = [
  {
    id: "sample-1",
    title: "NGO Education Website",
    organization: "BrightSteps Foundation",
    category: "Education",
    difficulty: "Beginner",
    status: "Open",
  },
  {
    id: "sample-2",
    title: "Small Business Inventory Tool",
    organization: "CornerCart Retail",
    category: "Technology",
    difficulty: "Intermediate",
    status: "Open",
  },
  {
    id: "sample-3",
    title: "Community Awareness Campaign",
    organization: "GreenNeighbour Network",
    category: "Community",
    difficulty: "Beginner",
    status: "Open",
  },
];

function readFeaturedProjects(): DashboardChallenge[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleProjects;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return sampleProjects;

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .filter((item) => item.status === "Open")
      .slice(0, 3)
      .map((item, index) => ({
        id: String(item.id ?? `challenge-${index}`),
        title: String(item.title ?? "Untitled challenge"),
        organization: String(item.organization ?? "Organization not specified"),
        category: String(item.category ?? "General"),
        difficulty: String(item.difficulty ?? "Not specified"),
        status: String(item.status ?? "Open"),
      }));
  } catch (error) {
    console.error("Could not read PROOFQUEST challenges:", error);
    return sampleProjects;
  }
}

export default function Home() {
  const [projects, setProjects] = useState<DashboardChallenge[]>(sampleProjects);

  useEffect(() => {
    const refreshProjects = () => setProjects(readFeaturedProjects());

    refreshProjects();
    window.addEventListener("storage", refreshProjects);
    window.addEventListener("focus", refreshProjects);

    return () => {
      window.removeEventListener("storage", refreshProjects);
      window.removeEventListener("focus", refreshProjects);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#080B10] text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0B0F16] p-6 md:block">
          <div className="mb-10">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold tracking-wider">
                PROOF<span className="text-cyan-400">QUEST</span>
              </h1>
            </Link>
            <p className="mt-2 text-xs tracking-widest text-gray-500">
              OPEN INNOVATION NETWORK
            </p>
          </div>

          {/* Real navigation links to all implemented modules */}
          <ProofQuestQuickLinks />

          <div className="mt-10 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <ShieldCheck className="mb-3 text-cyan-400" size={22} />
            <p className="text-sm font-medium">Secure Collaboration</p>
            <p className="mt-2 text-xs leading-5 text-gray-400">
              Opportunities, teams and contributions in one workspace.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1 p-5 md:p-9">
          {/* Header */}
          <header className="mb-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Open Innovation Workspace</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <ProofQuestUserMenu />
            </div>
          </header>

          {/* Welcome section */}
          <div className="mb-8 flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-gradient-to-r from-[#101D29] to-[#0C121B] p-6 md:flex-row md:items-center md:p-8">
            <div>
              <p className="text-sm font-medium text-cyan-400">
                DISCOVER. COLLABORATE. DELIVER.
              </p>
              <h3 className="mt-3 text-2xl font-semibold md:text-3xl">
                Turn opportunities into impact.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Explore real-world projects, connect with organizations and
                build solutions together.
              </p>
            </div>

            <Link
              href="/challenges"
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-300"
            >
              <Plus size={18} />
              Explore Projects
            </Link>
          </div>

          {/* Live statistics from the existing browser prototype records */}
          <div className="mb-10">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Platform Overview</h3>
              <p className="mt-1 text-sm text-gray-500">
                Counts update from the records saved in this browser.
              </p>
            </div>
            <ProofQuestDashboardStats />
          </div>

          {/* Featured open challenges */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Discover Projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Open opportunities from organizations
              </p>
            </div>

            <Link
              href="/challenges"
              className="flex shrink-0 items-center gap-2 text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              View all <ArrowUpRight size={16} />
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl border border-white/10 bg-[#0D121B] p-5 transition hover:border-cyan-400/40"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="rounded-md bg-cyan-400/10 px-3 py-1 text-xs text-cyan-400">
                      {project.category}
                    </span>
                    <span className="text-xs text-emerald-400">Open</span>
                  </div>

                  <h4 className="text-lg font-semibold">{project.title}</h4>
                  <p className="mt-2 text-sm text-gray-400">
                    {project.organization}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs text-gray-400">
                      {project.difficulty}
                    </span>
                    <Link
                      href="/challenges"
                      className="flex items-center gap-1 text-sm text-cyan-400 transition hover:text-cyan-300"
                    >
                      View project <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-[#0D121B] px-6 py-10 text-center">
              <p className="font-medium text-gray-200">No open challenges yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Approved and open challenges will appear here.
              </p>
              <Link
                href="/challenges"
                className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
              >
                Browse Challenge Hub <ArrowUpRight size={15} />
              </Link>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 border-t border-white/10 pt-5 text-xs text-gray-600">
            PROOFQUEST © 2026 · Open Innovation Network
          </footer>
        </section>
      </div>
    </main>
  );
}
