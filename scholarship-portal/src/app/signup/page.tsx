import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";
import { signUpAsStudent } from "@/app/login/actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter your full name and email to create an account.",
  email_exists: "An account with that email already exists. Log in instead.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  const { error } = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h6 style={{ color: "var(--color-accent)", textAlign: "center" }}>SCHOLARSHIP MANAGEMENT SYSTEM</h6>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-6)", fontSize: 30 }}>Create your account</h2>

        {error && ERROR_MESSAGES[error] && (
          <div className="card" role="alert" style={{ marginBottom: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
            <p className="card-body" style={{ margin: 0, color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</p>
          </div>
        )}

        <form action={signUpAsStudent} className="card elev-md" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
          <div className="field">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" name="name" className="input" placeholder="Juan Dela Cruz" required aria-required="true" />
          </div>
          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" name="email" className="input" type="email" placeholder="you@example.com" required aria-required="true" />
          </div>
          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" name="password" className="input" type="password" placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: "var(--space-2)" }}>
            Create account
          </button>

          <p className="text-muted" style={{ fontSize: 12, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            Already have an account? <Link href="/login" style={{ fontWeight: 600 }}>Log in</Link>
          </p>

          <p className="text-muted" style={{ fontSize: 11, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            No real credentials are stored in this demo — your account is identified by email only.
          </p>
        </form>
      </div>
    </div>
  );
}
