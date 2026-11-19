export type ProofQuestRole =
  | "student"
  | "organization"
  | "coordinator"
  | "mentor"
  | "admin";

export type ProofQuestPermission =
  | "challenge:create"
  | "challenge:apply"
  | "challenge:approve"
  | "microquest:create"
  | "microquest:apply"
  | "application:manage"
  | "submission:create"
  | "submission:review"
  | "security:view"
  | "users:manage"
  | "organization:manage"
  | "impact:view";

export type ProofQuestUser = {
  id: string;
  name: string;
  email: string;
  role: ProofQuestRole;
  organizationName?: string;
};

export type ProofQuestSession = {
  user: ProofQuestUser;
  signedInAt: string;
};

export const PROOFQUEST_SESSION_KEY = "proofquest_auth_v1";

// These accounts are only for the local hackathon demonstration.
// Replace this file's login mechanism with Supabase Auth before production.
export const DEMO_ACCOUNTS: Array<ProofQuestUser & { password: string; hint: string }> = [
  { id: "demo-student", name: "Student Demo", email: "student@demo.proofquest", password: "Student@123", role: "student", hint: "Browse projects, apply and submit deliverables" },
  { id: "demo-organization", name: "BrightSteps Foundation", email: "organization@demo.proofquest", password: "Org@123", role: "organization", organizationName: "BrightSteps Foundation", hint: "Publish challenges and manage contributors" },
  { id: "demo-coordinator", name: "University Coordinator", email: "coordinator@demo.proofquest", password: "Coord@123", role: "coordinator", hint: "Review and approve university opportunities" },
  { id: "demo-mentor", name: "Project Mentor", email: "mentor@demo.proofquest", password: "Mentor@123", role: "mentor", hint: "Guide teams and review deliverables" },
  { id: "demo-admin", name: "Platform Administrator", email: "admin@demo.proofquest", password: "Admin@123", role: "admin", hint: "Manage the complete demonstration platform" },
];

const PERMISSIONS: Record<ProofQuestPermission, ProofQuestRole[]> = {
  "challenge:create": ["organization", "admin"],
  "challenge:apply": ["student"],
  "challenge:approve": ["coordinator", "admin"],
  "microquest:create": ["organization", "admin"],
  "microquest:apply": ["student"],
  "application:manage": ["organization", "coordinator", "admin"],
  "submission:create": ["student"],
  "submission:review": ["organization", "mentor", "coordinator", "admin"],
  "security:view": ["coordinator", "admin"],
  "users:manage": ["admin"],
  "organization:manage": ["coordinator", "admin"],
  "impact:view": ["student", "organization", "coordinator", "mentor", "admin"],
};

export function hasPermission(
  role: ProofQuestRole | null | undefined,
  permission: ProofQuestPermission,
): boolean {
  if (!role) return false;
  return PERMISSIONS[permission].includes(role);
}

const ROUTE_ACCESS: Array<{ prefix: string; roles: ProofQuestRole[] }> = [
  { prefix: "/", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/challenges", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/microquests", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/organizations", roles: ["student", "organization", "coordinator", "admin"] },
  { prefix: "/approvals", roles: ["coordinator", "admin"] },
  { prefix: "/applications", roles: ["student", "organization", "coordinator", "admin"] },
  { prefix: "/my-teams", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/workspace", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/reviews", roles: ["organization", "mentor", "coordinator", "admin"] },
  { prefix: "/impact", roles: ["student", "organization", "coordinator", "mentor", "admin"] },
  { prefix: "/security", roles: ["coordinator", "admin"] },
  { prefix: "/security-logs", roles: ["coordinator", "admin"] },
];

export function canAccessRoute(role: ProofQuestRole, pathname: string): boolean {
  if (role === "admin") return true;
  const rule = ROUTE_ACCESS.find(({ prefix }) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  // Unknown routes are denied by default once a user is signed in.
  return rule ? rule.roles.includes(role) : false;
}

export function getProofQuestSession(): ProofQuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROOFQUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<ProofQuestSession>;
    const user = candidate.user as Partial<ProofQuestUser> | undefined;
    const validRoles: ProofQuestRole[] = ["student", "organization", "coordinator", "mentor", "admin"];
    if (!user || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string" || !validRoles.includes(user.role as ProofQuestRole)) return null;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as ProofQuestRole,
        organizationName: typeof user.organizationName === "string" ? user.organizationName : undefined,
      },
      signedInAt: typeof candidate.signedInAt === "string" ? candidate.signedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function signInDemo(email: string, password: string): ProofQuestSession | null {
  if (typeof window === "undefined") return null;
  const account = DEMO_ACCOUNTS.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
  );
  if (!account) return null;
  const session: ProofQuestSession = {
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      organizationName: account.organizationName,
    },
    signedInAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PROOFQUEST_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("proofquest-auth-change"));
  return session;
}

export function signOutDemo(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROOFQUEST_SESSION_KEY);
  window.dispatchEvent(new Event("proofquest-auth-change"));
}

export function roleLabel(role: ProofQuestRole): string {
  const labels: Record<ProofQuestRole, string> = {
    student: "Student",
    organization: "Organization",
    coordinator: "University Coordinator",
    mentor: "Mentor",
    admin: "Platform Admin",
  };
  return labels[role];
}
