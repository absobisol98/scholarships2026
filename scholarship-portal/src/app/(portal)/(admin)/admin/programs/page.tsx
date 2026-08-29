import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleProgramActive, createProgram, updateProgram, deleteProgram } from "@/lib/actions/programs";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { NewProgramModal } from "./new-program-modal";
import { ProgramRowActions } from "./program-row-actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_name: "A program name is required.",
  key_taken: "That URL key is already in use by another program — choose a different name or key.",
  has_applicants: "This program has applicants on file and can't be deleted. Deactivate it instead if you want to stop taking new applications.",
};

export default async function ManageProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; status?: string }>;
}) {
  await requireSuperAdmin();
  const { error, q = "", status = "all" } = await searchParams;

  const [programs, countAll, countActive, countInactive] = await Promise.all([
    db.program.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
      },
      orderBy: { order: "asc" },
      include: { _count: { select: { applications: true } } },
    }),
    db.program.count(),
    db.program.count({ where: { active: true } }),
    db.program.count({ where: { active: false } }),
  ]);

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

        <FiltersPanel
          method="GET"
          resetHref="/admin/programs"
          style={{ margin: "var(--space-6) 0 var(--space-4)" }}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button type="submit" variant="secondary">Search</Button>
              <span className="text-muted" style={{ fontSize: 12 }}>{countAll} program{countAll === 1 ? "" : "s"}</span>
            </div>
          }
        >
          <Field label="Program name" htmlFor="programs-search">
            <Input id="programs-search" name="q" placeholder="Search programs..." defaultValue={q} />
          </Field>
          <Field label="Status" htmlFor="programs-status">
            <AutoSubmitSelect
              id="programs-status"
              name="status"
              defaultValue={status}
              options={[
                { value: "all", label: `All (${countAll})` },
                { value: "active", label: `Active (${countActive})` },
                { value: "inactive", label: `Inactive (${countInactive})` },
              ]}
            />
          </Field>
        </FiltersPanel>

        <TableScroll>
          <Table aria-label="Programs">
            <thead>
              <tr>
                <th scope="col">Program</th>
                <th scope="col">Form type</th>
                <th scope="col">Applicants</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.length === 0 && (
                <tr><td colSpan={5} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No programs match these filters.</td></tr>
              )}
              {programs.map((p) => {
                const onToggle = toggleProgramActive.bind(null, p.id);
                const onUpdate = updateProgram.bind(null, p.id);
                const onDelete = deleteProgram.bind(null, p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: 34, height: 34, flex: "none", borderRadius: "var(--radius-sm)",
                            background: p.active ? "var(--color-accent-100)" : "var(--color-neutral-100)",
                            color: p.active ? "var(--color-accent-700)" : "var(--color-neutral-800)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            font: "700 13px var(--font-heading)",
                          }}
                        >
                          {p.name.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>{p.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{p.formKind === "generika" ? "Generika-style" : "Standard"}</td>
                    <td>{p._count.applications}</td>
                    <td>
                      <Tag variant={p.active ? "success" : "neutral"} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className="status-dot" aria-hidden="true" />
                        {p.active ? "Active" : "Inactive"}
                      </Tag>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <ProgramRowActions
                        programName={p.name}
                        active={p.active}
                        amount={p.amount}
                        deadlineLabel={p.deadlineLabel}
                        deadlineFull={p.deadlineFull}
                        blurb={p.blurb}
                        tags={JSON.parse(p.tagsJson) as string[]}
                        onUpdate={onUpdate}
                        onToggle={onToggle}
                        onDelete={onDelete}
                      />
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
