import { notFound, redirect } from "next/navigation";
import { requireAdminLike } from "@/lib/auth";
import { getProgramByKey, canAccessProgram } from "@/lib/admin-data";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminWorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const session = await requireAdminLike();
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  if (!(await canAccessProgram(session.role, program.id))) redirect("/admin");

  return (
    <>
      <AdminSidebar programKey={program.key} workspaceName={program.name} isSuperAdmin={session.role === "super_admin"} />
      <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
        {children}
      </div>
    </>
  );
}
