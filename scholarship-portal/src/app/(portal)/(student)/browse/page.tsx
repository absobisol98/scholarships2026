import { getCurrentStudent } from "@/lib/auth";
import { listProgramsForBrowse } from "@/lib/student-data";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { LinkButton, type ButtonVariant } from "@/components/ui/button";

export default async function BrowsePage() {
  const student = await getCurrentStudent();
  // Only active programs appear here — a deactivated program's own submission history is
  // still reachable from /submissions, this listing just stops surfacing it as an option.
  const rows = (await listProgramsForBrowse(student.id)).filter((r) => r.program.active);

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Choose a scholarship to apply for</h2>
          <p className="text-muted" style={{ maxWidth: 560 }}>
            {rows.length} program{rows.length === 1 ? " is" : "s are"} currently accepting applications. You can apply to more than one — each keeps its own progress and deadline.
          </p>
        </div>
        <LinkButton href="/submissions" variant="secondary" style={{ flex: "none", whiteSpace: "nowrap" }}>
          My submission history
        </LinkButton>
      </div>

      <div className="browse-grid" style={{ marginTop: "var(--space-6)" }}>
        {rows.map(({ program: p, tags, statusLabel, statusTagClass, buttonLabel, buttonClass, href }) => (
          <Card key={p.id} elevation="md" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="grayscale" style={{ width: "100%", height: 140, flex: "none", background: "var(--color-neutral-300)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Program photo</span>
            </div>
            <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)", flex: 1 }}>
              <CardKicker>{p.deadlineLabel}</CardKicker>
              <CardTitle>{p.name}</CardTitle>
              <CardBody>{p.blurb}</CardBody>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "var(--space-2)" }}>
                {tags.map((tg) => (
                  <Tag key={tg} variant="neutral">{tg}</Tag>
                ))}
              </div>
              <div style={{ marginTop: "auto", paddingTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
                <Tag variant={statusTagClass.replace(/^tag-/, "") as TagVariant} style={{ whiteSpace: "nowrap", alignSelf: "flex-start" }}>{statusLabel}</Tag>
                <LinkButton href={href} variant={buttonClass.replace(/^btn-/, "") as ButtonVariant} style={{ whiteSpace: "nowrap" }}>{buttonLabel}</LinkButton>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
