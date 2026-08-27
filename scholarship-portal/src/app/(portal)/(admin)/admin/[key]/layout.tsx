import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProgramByKey } from "@/lib/admin-data";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminWorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  return (
    <>
      <AdminSidebar programKey={program.key} workspaceName={program.name} />
      <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
        {children}
      </div>
    </>
  );
}
