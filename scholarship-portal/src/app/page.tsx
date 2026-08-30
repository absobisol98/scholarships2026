import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";
import { loginAsApplicant, loginAsStudent } from "@/app/login/actions";
import { LoginShell } from "@/components/login-shell";

// The applicant door. Staff sign in through their own role's page (/screener, /admin,
// /super_admin) — this one keeps Google sign-in, the demo persona, and the signup link,
// since all three only ever applied to applicants.
export default async function ApplicantLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  const { error } = await searchParams;

  return (
    <LoginShell
      kicker="SCHOLARSHIP MANAGEMENT SYSTEM"
      heading="Sign in"
      action={loginAsApplicant}
      error={error}
      showGoogle
      demoAction={loginAsStudent}
      demoLabel="Log in as demo applicant"
      footer={
        <p className="text-muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
          Don&apos;t have an account? <Link href="/signup" style={{ fontWeight: 600 }}>Sign up</Link>
        </p>
      }
      otherDoors={[
        { label: "Paper Screener sign-in", href: "/screener" },
        { label: "Program Admin sign-in", href: "/admin" },
      ]}
    />
  );
}
