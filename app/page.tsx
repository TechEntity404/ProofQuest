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
    <main className="min-h-screen bg-[#F2F0EA] text-[#191918]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-[#D8D5CC] bg-[#EAE7DE] p-6 md:block">
          <div className="mb-9">
            <Link href="/" className="inline-block">
              <h1 className="text-xl font-bold tracking-[0.12em]">
                PROOF<span className="text-[#A04A32]">QUEST</span>
              </h1>
            </Link>
            <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-[#77756D]">
              OPEN INNOVATION NETWORK
            </p>
          </div>

          {/* Real navigation links to all implemented modules */}
          <ProofQuestQuickLinks />

          <div className="mt-10 border-t border-[#D1CEC4] pt-5">
            <ShieldCheck className="mb-3 text-[#A04A32]" size={20} strokeWidth={1.7} />
            <p className="text-sm font-semibold">Secure Collaboration</p>
            <p className="mt-2 text-xs leading-5 text-[#77756D]">
              Opportunities, teams and contributions in one workspace.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1 px-5 py-6 md:px-9 md:py-8 lg:px-12">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between gap-4 border-b border-[#D8D5CC] pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#77756D] bg-[#EAE7DE]">Open Innovation Workspace</p>
              <h2 className="mt-2 font-serif text-3xl leading-none md:text-[42px]">
                Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <ProofQuestUserMenu />
            </div>
          </header>

          {/* Welcome section */}
          <div className="mb-9 grid border border-[#CFCBC0] bg-[#FBFAF6] md:grid-cols-[1fr_auto]">
            <div className="p-6 md:p-8">
              <p className="text-l font-bold uppercase tracking-[0.14em] text-[#A04A32]">
                DISCOVER. COLLABORATE. DELIVER.
              </p>
              <h3 className="mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-[40px] text-[#A04A32]">
                Turn opportunities into impact.
              </h3>
              <p className="mt-4 max-w-xl text-m leading-6 text-[#030712]">
                Explore real-world projects, connect with organizations and
                build solutions together.
              </p>
            </div>

            <Link
              href="/challenges"
              className="m-5 flex min-h-12 items-center justify-center gap-2 self-end border border-[#191918] bg-[#fafafa] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#Be123c] md:m-8"
            >
              <Plus size={18} />
              Explore Projects
            </Link>
          </div>

          {/* Live statistics from the existing browser prototype records */}
          <div className="mb-9">
            <div className="mb-4 flex items-end justify-between border-b border-[#D8D5CC] pb-3">
              <h3 className="font-serif text-2xl">Platform Overview</h3>
              <p className="hidden text-xs text-[#77756D] sm:block">
                Counts update from the records saved in this browser.
              </p>
            </div>
            <ProofQuestDashboardStats />
          </div>

          {/* Featured open challenges */}
          <div className="mb-5 flex items-end justify-between gap-3 border-b border-[#D8D5CC] pb-3">
            <div>
              <h3 className="font-serif text-2xl">Discover Projects</h3>
              <p className="mt-1 text-sm text-[#77756D]">
                Open opportunities from organizations
              </p>
            </div>

            <Link
              href="/challenges"
              className="mb-1 flex shrink-0 items-center gap-2 text-sm font-semibold text-[#A04A32] transition hover:text-[#191918]"
            >
              View all <ArrowUpRight size={16} />
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="grid border-l border-t border-[#D8D5CC] lg:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="border-b border-r border-[#D8D5CC] bg-[#FBFAF6] p-5 transition-colors hover:bg-white"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="border-l-2 border-[#A04A32] pl-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#A04A32]">
                      {project.category}
                    </span>
                    <span className="text-xs font-medium text-[#4C735B]">Open</span>
                  </div>

                  <h4 className="font-serif text-xl leading-snug">{project.title}</h4>
                  <p className="mt-2 text-sm text-[#686760]">
                    {project.organization}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-[#E2DFD6] pt-4">
                    <span className="text-xs text-[#77756D]">
                      {project.difficulty}
                    </span>
                    <Link
                      href="/challenges"
                      className="flex items-center gap-1 text-sm font-semibold text-[#A04A32] transition hover:text-[#191918]"
                    >
                      View project <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-[#CFCBC0] bg-[#FBFAF6] px-6 py-10 text-center">
              <p className="font-serif text-xl text-[#191918]">No open challenges yet</p>
              <p className="mt-2 text-sm text-[#77756D]">
                Approved and open challenges will appear here.
              </p>
              <Link
                href="/challenges"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#A04A32] hover:text-[#191918]"
              >
                Browse Challenge Hub <ArrowUpRight size={15} />
              </Link>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 border-t border-[#D8D5CC] pt-5 text-xs text-[#77756D]">
            PROOFQUEST © 2026 · Open Innovation Network
          </footer>
        </section>
      </div>
    </main>
  );
}
