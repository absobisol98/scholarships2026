import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStaffAccount, toggleStaffActive, addStaffProgramAssignment, removeStaffProgramAssignment, updateStaffEmail, bulkDeactivateStaff } from "@/lib/actions/staff";
import { NewUserModal } from "./new-user-modal";
import { UsersTable, type UserRow } from "./users-table";
import { Breadcrumb } from "@/components/breadcrumb";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  await requireSuperAdmin();
  const { q = "", sort = "", dir = "asc" } = await searchParams;
  const sortDir = dir === "desc" ? "desc" : "asc";

  const [staff, programs] = await Promise.all([
    db.staffAccount.findMany({
      where: {
        role: { in: ["admin", "screener"] },
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { programAssignments: { include: { program: true } }, applicantAssignments: true },
      orderBy: sort === "createdAt" ? { createdAt: sortDir } : [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.program.findMany({ orderBy: { order: "asc" } }),
  ]);

  const rows: UserRow[] = staff.map((s) => {
    const assignedIds = new Set(s.programAssignments.map((pa) => pa.programId));
    const availablePrograms = programs.filter((p) => !assignedIds.has(p.id));
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role as "admin" | "screener",
      active: s.active,
      isDemo: s.isDemo,
      createdAtLabel: formatDate(s.createdAt),
      programAssignments: s.programAssignments.map((pa) => ({ id: pa.id, programId: pa.programId, programName: pa.program.name })),
      availablePrograms: availablePrograms.map((p) => ({ id: p.id, name: p.name })),
      applicantsAssignedCount: s.applicantAssignments.length,
      onToggleActive: toggleStaffActive.bind(null, s.id),
      onAddAssignment: addStaffProgramAssignment.bind(null, s.id),
      onRemoveAssignment: removeStaffProgramAssignment.bind(null, s.id),
      onEmailChange: async (value: string) => { "use server"; await updateStaffEmail(s.id, value); },
    };
  });

  const createdAtSortHref = `/admin/users?sort=createdAt&dir=${sort === "createdAt" && sortDir === "asc" ? "desc" : "asc"}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Manage Users" }]} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
            <h2 style={{ marginBottom: 4 }}>Manage Users</h2>
            <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
              Create or deactivate Program Admin and Paper Screener accounts, and control which program(s) each Admin manages.
            </p>
          </div>
          <NewUserModal programs={programs.map((p) => ({ id: p.id, name: p.name }))} onCreate={createStaffAccount} />
        </div>

        <FiltersPanel
          method="GET"
          resetHref="/admin/users"
          style={{ marginTop: "var(--space-6)" }}
          footer={<Button type="submit" variant="secondary" style={{ alignSelf: "flex-start" }}>Search</Button>}
        >
          <Field label="Name or email" htmlFor="users-search">
            <Input id="users-search" name="q" placeholder="Search by name or email..." defaultValue={q} />
          </Field>
        </FiltersPanel>

        <UsersTable rows={rows} onBulkDeactivate={bulkDeactivateStaff} createdAtSortHref={createdAtSortHref} sortDir={sort === "createdAt" ? sortDir : "asc"} />
      </div>
    </div>
  );
}
