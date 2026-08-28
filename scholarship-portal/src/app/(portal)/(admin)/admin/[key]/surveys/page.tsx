import { notFound } from "next/navigation";
import { getProgramByKey, getSurveyWaves, getSurveySends } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { updateSurveyQuestion, addSurveyQuestion, removeSurveyQuestion, toggleSurveyDeployed, sendSurveyToGroup } from "@/lib/actions/admin";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { SurveySendPanel } from "./survey-send-panel";

const WAVE_TITLES: Record<string, string> = { midYear: "Mid-Year Check-in", yearEnd: "Year-End Check-in" };

export default async function SurveysPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [waves, awardedApplicants] = await Promise.all([
    getSurveyWaves(program.id),
    db.applicant.findMany({ where: { programId: program.id, decision: "awarded" }, orderBy: { id: "asc" } }),
  ]);
  const sends = await getSurveySends(awardedApplicants.map((a) => a.id));

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Check-in surveys</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>Deploy monitoring questionnaires to scholars twice a year. Each program keeps its own independent set of questions.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        {waves.map((wave) => {
          const onAddQuestion = addSurveyQuestion.bind(null, program.key, wave.id);
          const onToggleDeploy = toggleSurveyDeployed.bind(null, program.key, wave.id);
          const sendToIds = sendSurveyToGroup.bind(null, program.key, wave.wave);
          const sentCount = awardedApplicants.filter((a) => sends.get(a.id)?.[wave.wave]).length;
          const recipients = awardedApplicants.map((a) => ({ id: a.id, name: a.name, alreadySent: !!sends.get(a.id)?.[wave.wave] }));

          return (
            <Card key={wave.id} elevation="sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle>{WAVE_TITLES[wave.wave]}</CardTitle>
                <Tag variant={wave.status === "deployed" ? "accent" : "outline"} style={{ whiteSpace: "nowrap" }}>
                  {wave.status === "deployed" ? "Deployed" : "Draft"}
                </Tag>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                {wave.questions.map((q) => {
                  const onRemove = removeSurveyQuestion.bind(null, program.key, q.id);
                  return (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
                      <AutoSaveTextInput
                        defaultValue={q.label}
                        ariaLabel="Survey question"
                        style={{ flex: 1 }}
                        action={async (value) => { "use server"; await updateSurveyQuestion(program.key, q.id, value); }}
                      />
                      <form action={onRemove}>
                        <Button type="submit" variant="ghost" aria-label={`Remove question: ${q.label}`}>Remove</Button>
                      </form>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                <form action={onAddQuestion}><Button type="submit" variant="secondary">+ Add question</Button></form>
                <form action={onToggleDeploy}>
                  <Button type="submit" variant={wave.status === "deployed" ? "secondary" : "primary"}>
                    {wave.status === "deployed" ? "Unpublish" : "Deploy to scholars"}
                  </Button>
                </form>
              </div>

              <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "2px solid var(--color-divider)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Send to awarded scholars</p>
                <SurveySendPanel waveKey={wave.wave} recipients={recipients} sendToIds={sendToIds} />
                <p className="text-muted" style={{ fontSize: 12, margin: "var(--space-2) 0 0" }}>
                  Sent to {sentCount} of {awardedApplicants.length} awarded applicants
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
