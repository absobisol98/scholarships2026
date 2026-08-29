import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleProgramActive, createProgram, updateProgram, deleteProgram } from "@/lib/actions/programs";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { NewProgramModal } from "./new-program-modal";
import { EditProgramModal } from "./edit-program-modal";
import { DeleteProgramButton } from "./delete-program-button";

const ERROR_MESSAGES: Record<string, string> = {
  missing_name: "A program name is required.",
  key_taken: "That URL key is already in use by another program — choose a different name or key.",
  has_applicants: "This program has applicants on file and can't be deleted. Deactivate it instead if you want to stop taking new applications.",
};

export default async function ManageProgramsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperAdmin();
  const { error } = await searchParams;
  const programs = await db.program.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Manage Programs" }]} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
            <h2 style={{ marginBottom: 4 }}>Manage Programs</h2>
            <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
              Create scholarship programs, edit their details, and control which ones are active. A
              deactivated program is hidden from the Browse list and can&apos;t accept new
              applications — students who already applied keep working access to their own
              application, status, and award pages.
            </p>
          </div>
          <NewProgramModal onCreate={createProgram} />
        </div>

        {error && ERROR_MESSAGES[error] && (
          <Card role="alert" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</CardBody>
          </Card>
        )}

        <TableScroll style={{ marginTop: "var(--space-6)" }}>
          <Table aria-label="Programs">
            <thead>
              <tr>
                <th scope="col">Program</th>
                <th scope="col">Form type</th>
                <th scope="col">Applicants</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.length === 0 && (
                <tr><td colSpan={5} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No programs yet.</td></tr>
              )}
              {programs.map((p) => {
                const onToggle = toggleProgramActive.bind(null, p.id);
                const onUpdate = updateProgram.bind(null, p.id);
                const onDelete = deleteProgram.bind(null, p.id);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{p.formKind === "generika" ? "Generika-style" : "Standard"}</td>
                    <td>{p._count.applications}</td>
                    <td>
                      <Tag variant={p.active ? "accent" : "neutral"}>{p.active ? "Active" : "Inactive"}</Tag>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                        <EditProgramModal
                          programName={p.name}
                          amount={p.amount}
                          deadlineLabel={p.deadlineLabel}
                          deadlineFull={p.deadlineFull}
                          blurb={p.blurb}
                          tags={JSON.parse(p.tagsJson) as string[]}
                          onUpdate={onUpdate}
                        />
                        <form action={onToggle}>
                          <button type="submit" className={p.active ? "link-delete" : "link-edit"}>
                            {p.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <DeleteProgramButton programName={p.name} onDelete={onDelete} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      </div>
    </div>
  );
}
