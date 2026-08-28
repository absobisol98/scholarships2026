type ApplicationData = {
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianOcc: string;
  income: string;
  dependents: string;
  familyMembers: { name: string; relationship: string; occupation: string }[];
  school: string;
  gpa: string;
  graduation: string;
  major: string;
  certFileName: string | null;
  videoFileName: string | null;
  leadRole: string;
  leadOrg: string;
  leadDuration: string;
  leadPeople: string;
  leadDesc: string;
  volunteerOrg: string;
  volunteerHours: string;
  volunteerYears: string;
  communityDesc: string;
  essayText: string;
  essayText2: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
      <p style={{ margin: "2px 0 0", fontSize: 14 }}>{value || <span className="text-muted">Not provided</span>}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card elev-sm">
      <div className="card-kicker">{title}</div>
      <div className="grid-2" style={{ marginTop: 8, rowGap: "var(--space-3)" }}>
        {children}
      </div>
    </div>
  );
}

// A read-only rendering of everything the applicant already submitted — shown wherever
// the form itself is locked (already submitted, or the access window has closed) so the
// applicant can still see their own answers instead of a blank "you can't edit this" card.
export function ReadOnlyApplicationView({ application, isGenerika }: { application: ApplicationData; isGenerika: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
      <Section title="Personal information">
        <Row label="Full name" value={application.fullName} />
        <Row label="Date of birth" value={application.dob} />
        <Row label="Email" value={application.email} />
        <Row label="Phone" value={application.phone} />
        <div style={{ gridColumn: "1 / -1" }}>
          <Row label="Mailing address" value={application.address} />
        </div>
      </Section>

      <Section title="Family information">
        <Row label="Parent / guardian name" value={application.guardianName} />
        <Row label="Parent / guardian occupation" value={application.guardianOcc} />
        <Row label="Household annual income" value={application.income} />
        <Row label="Number of dependents" value={application.dependents} />
      </Section>

      {isGenerika && application.familyMembers.length > 0 && (
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

      {isGenerika ? (
        <Section title="Leadership experience">
          <Row label="Leadership role / title" value={application.leadRole} />
          <Row label="Organization" value={application.leadOrg} />
          <Row label="Duration" value={application.leadDuration} />
          <Row label="People led / team size" value={application.leadPeople} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Row label="Description" value={application.leadDesc} />
          </div>
        </Section>
      ) : (
        <Section title="Academic information">
          <div style={{ gridColumn: "1 / -1" }}>
            <Row label="School name" value={application.school} />
          </div>
          <Row label="GPA" value={application.gpa} />
          <Row label="Expected graduation" value={application.graduation} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Row label="Intended major / field of study" value={application.major} />
          </div>
          <Row label="Certificate of school registration" value={application.certFileName ?? ""} />
          <Row label="Introduction video" value={application.videoFileName ?? ""} />
        </Section>
      )}

      <Section title="Community involvement">
        <div style={{ gridColumn: "1 / -1" }}>
          <Row label="Volunteer organization(s)" value={application.volunteerOrg} />
        </div>
        <Row label="Hours per month" value={application.volunteerHours} />
        <Row label="Years involved" value={application.volunteerYears} />
        <div style={{ gridColumn: "1 / -1" }}>
          <Row label="Description" value={application.communityDesc} />
        </div>
      </Section>

      <div className="card elev-sm">
        <div className="card-kicker">Personal statement</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: 8 }}>
          <Row label="Essay" value={application.essayText} />
          <Row label="Why does this scholarship matter to your goals?" value={application.essayText2} />
        </div>
      </div>
    </div>
  );
}
