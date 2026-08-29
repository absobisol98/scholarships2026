import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessProgram, getApplicantsForExport } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";

const COLUMNS = [
  { key: "id", label: "Application ID" },
  { key: "fullName", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "dob", label: "Date of birth" },
  { key: "sex", label: "Sex" },
  { key: "yearLevel", label: "Year level" },
  { key: "institutionType", label: "Institution type" },
  { key: "nationality", label: "Nationality" },
  { key: "region", label: "Region" },
  { key: "province", label: "Province" },
  { key: "city", label: "City" },
  { key: "municipality", label: "Municipality" },
  { key: "income", label: "Household income" },
  { key: "school", label: "School" },
  { key: "gpa", label: "GPA" },
  { key: "submittedDate", label: "Submitted" },
  { key: "decision", label: "Decision" },
  { key: "awardResponse", label: "Award response" },
];

// Aggregate export — admin/super_admin only (no student/screener branch, unlike the
// per-application document route this mirrors the auth pattern of).
export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const { programId: programIdParam } = await params;
  const programId = Number(programIdParam);
  if (!Number.isInteger(programId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await canAccessProgram(session.role, programId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const rows = await getApplicantsForExport(programId, {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    flag: url.searchParams.get("flag") ?? undefined,
  });
  const csv = toCsv(COLUMNS, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applicants-${programId}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
