import { valueForField, parseCustomFields } from "@/lib/field-config";

type FieldConfigRow = {
  id: string;
  label: string;
  enabled: boolean;
  fieldKey: string | null;
  fieldType: string;
};

type ApplicationData = Record<string, unknown> & {
  customFieldsJson: string;
  familyMembers: { name: string; relationship: string; occupation: string }[];
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
      <p style={{ margin: "2px 0 0", fontSize: 14 }}>{value || <span className="text-muted">Not provided</span>}</p>
    </div>
  );
}

// One card per step, listing whatever fields are currently enabled for it — so a field an
// admin has since disabled or relabeled shows up (or not) exactly as it would on the live
// form today, not as it was when the applicant answered it.
function Section({
  title,
  fields,
  application,
  custom,
}: {
  title: string;
  fields: FieldConfigRow[];
  application: ApplicationData;
  custom: Record<string, string>;
}) {
  const rows = fields.filter((f) => f.enabled && f.fieldKey !== "familyMembers");
  if (rows.length === 0) return null;
  return (
    <div className="card elev-sm">
      <div className="card-kicker">{title}</div>
      <div className="grid-2" style={{ marginTop: 8, rowGap: "var(--space-3)" }}>
        {rows.map((f) => (
          <div key={f.id} style={f.fieldType === "paragraph" ? { gridColumn: "1 / -1" } : undefined}>
            <Row label={f.label} value={valueForField(f, application, custom)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// A read-only rendering of everything the applicant already submitted — shown wherever
// the form itself is locked (already submitted, or the access window has closed) so the
// applicant can still see their own answers instead of a blank "you can't edit this" card.
export function ReadOnlyApplicationView({
  application,
  fieldsByStep,
  isGenerika,
}: {
  application: ApplicationData;
  fieldsByStep: Map<string, FieldConfigRow[]>;
  isGenerika: boolean;
}) {
  const custom = parseCustomFields(application.customFieldsJson);
  const personal = fieldsByStep.get("personal") ?? [];
  const family = fieldsByStep.get("family") ?? [];
  const academicOrLeadership = fieldsByStep.get(isGenerika ? "leadership" : "academic") ?? [];
  const community = fieldsByStep.get("community") ?? [];
  const statement = fieldsByStep.get("statement") ?? [];
  const familyMembersEnabled = family.some((f) => f.enabled && f.fieldKey === "familyMembers");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
      <Section title="Personal information" fields={personal} application={application} custom={custom} />
      <Section title="Family information" fields={family} application={application} custom={custom} />

      {isGenerika && familyMembersEnabled && application.familyMembers.length > 0 && (
        <div className="card elev-sm">
          <div className="card-kicker">Family members</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {application.familyMembers.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: "var(--space-4)", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ flex: 1 }}>{m.name || <span className="text-muted">—</span>}</span>
                <span className="text-muted" style={{ flex: 1 }}>{m.relationship || "—"}</span>
                <span className="text-muted" style={{ flex: 1 }}>{m.occupation || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Section title={isGenerika ? "Leadership experience" : "Academic information"} fields={academicOrLeadership} application={application} custom={custom} />
      <Section title="Community involvement" fields={community} application={application} custom={custom} />
      <Section title="Personal statement" fields={statement} application={application} custom={custom} />
    </div>
  );
}
