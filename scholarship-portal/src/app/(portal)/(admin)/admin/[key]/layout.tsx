import { notFound, redirect } from "next/navigation";
import { requireAdminLike, getCurrentStaff, initialsFor } from "@/lib/auth";
import { getProgramByKey, canAccessProgram } from "@/lib/admin-data";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminWorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const session = await requireAdminLike();
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  if (!(await canAccessProgram(session.role, program.id))) redirect("/admin");

  const staff = await getCurrentStaff(session.role);

  return (
    <>
      <AdminSidebar
        programKey={program.key}
        workspaceName={program.name}
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
