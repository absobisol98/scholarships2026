import { notFound, redirect } from "next/navigation";
import { requireAdminLike, getCurrentStaff, initialsFor } from "@/lib/auth";
import { getProgramByKey, canAccessProgram, getAccessibleProgramIds, listWorkspacePrograms } from "@/lib/admin-data";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminWorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const session = await requireAdminLike();
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  if (!(await canAccessProgram(session.role, program.id))) redirect("/admin");

  const [staff, accessibleProgramIds] = await Promise.all([getCurrentStaff(session.role), getAccessibleProgramIds(session.role)]);
  // Only worth a dropdown once there's something to switch between — a single-program
  // Admin sees the same plain workspace-name label as before.
  const workspaces =
    accessibleProgramIds === "all" || accessibleProgramIds.length > 1
      ? (await listWorkspacePrograms(accessibleProgramIds)).map((w) => ({ key: w.program.key, name: w.program.name }))
      : undefined;

  return (
    <>
      <AdminSidebar
        programKey={program.key}
        workspaceName={program.name}
        workspaces={workspaces}
        isSuperAdmin={session.role === "super_admin"}
        profileName={staff.name}
        profileInitials={initialsFor(staff.name)}
        profileRole={session.role === "super_admin" ? "Super Admin" : "Program Admin"}
      />
      <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
        {children}
      </div>
    </>
  );
}
