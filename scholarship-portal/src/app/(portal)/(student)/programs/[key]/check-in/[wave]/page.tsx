import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForAward } from "@/lib/student-data";
import { submitCheckInResponse } from "@/lib/actions/student";
import { WAVE_TITLES } from "@/lib/steps";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default async function CheckInPage({ params }: { params: Promise<{ key: string; wave: string }> }) {
  const { key, wave } = await params;
  const program = await getProgramByKey(key);
  if (!program || !WAVE_TITLES[wave]) notFound();

  const student = await getCurrentStudent();
  const application = await resolveApplicationForAward(student.id, program.id);
  if (!application) notFound();

  // A scholar can only reach a wave actually sent to them — not reachable by guessing a
  // URL for a wave the program happens to have deployed but never sent to this applicant.
  const send = await db.surveySend.findUnique({ where: { applicationId_wave: { applicationId: application.id, wave } } });
  if (!send) notFound();

  const surveyWave = await db.surveyWave.findUnique({
    where: { programId_wave: { programId: program.id, wave } },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!surveyWave) notFound();

  const existingResponses = await db.surveyResponse.findMany({
    where: { applicationId: application.id, surveyQuestionId: { in: surveyWave.questions.map((q) => q.id) } },
  });
  const answerByQuestionId = new Map(existingResponses.map((r) => [r.surveyQuestionId, r.answer]));

  const onSubmit = submitCheckInResponse.bind(null, program.key, wave);

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name}</h6>
      <h2 style={{ marginBottom: 4 }}>{WAVE_TITLES[wave]}</h2>
      <p className="text-muted" style={{ maxWidth: 560 }}>
        {send.completedAt
          ? "You've already completed this check-in — you can update your answers below."
          : "A few quick questions from the program team."}
      </p>

      <form action={onSubmit} style={{ marginTop: "var(--space-6)" }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {surveyWave.questions.map((q) => (
            <Field key={q.id} label={q.label} htmlFor={`q-${q.id}`} required>
              <Textarea id={`q-${q.id}`} name={`q_${q.id}`} rows={3} required aria-required="true" defaultValue={answerByQuestionId.get(q.id) ?? ""} />
            </Field>
          ))}
        </Card>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button type="submit" variant="primary">{send.completedAt ? "Update answers" : "Submit"}</Button>
        </div>
      </form>
    </div>
  );
}
