import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";
import { loginAsAdmin, loginAsScreener, loginAsStudent, loginAsSuperAdmin, loginWithEmail } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  admin_deactivated: "This Program Admin account has been deactivated by a Super Admin.",
  screener_deactivated: "This Paper Screener account has been deactivated by a Super Admin.",
  super_admin_deactivated: "This Super Admin account has been deactivated.",
  no_account: "No account found with that email. New here? Create an account below.",
  missing_email: "Enter your email to log in.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  const { error } = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h6 style={{ color: "var(--color-accent)", textAlign: "center" }}>SCHOLARSHIP MANAGEMENT SYSTEM</h6>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-6)", fontSize: 30 }}>Sign in</h2>

        {error && ERROR_MESSAGES[error] && (
          <div className="card" role="alert" style={{ marginBottom: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
            <p className="card-body" style={{ margin: 0, color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</p>
          </div>
        )}

        <form action={loginWithEmail} className="card elev-md" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
          <button type="submit" formAction={loginAsStudent} className="btn btn-secondary btn-block" style={{ justifyContent: "flex-start", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v9h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.09c4.15-3.82 6.58-9.46 6.58-16.16z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.34l-7.09-5.52c-1.97 1.32-4.5 2.1-7.47 2.1-5.75 0-10.62-3.88-12.36-9.1H4.34v5.7C7.96 40.98 15.4 46 24 46z" />
              <path fill="#FBBC05" d="M11.64 28.14A13.9 13.9 0 0 1 10.8 24c0-1.44.25-2.83.7-4.14v-5.7H4.34A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.34 9.84z" />
              <path fill="#EA4335" d="M24 10.94c3.24 0 6.15 1.11 8.44 3.29l6.28-6.28C34.9 4.18 29.93 2 24 2 15.4 2 7.96 7.02 4.34 14.16l7.3 5.7c1.74-5.22 6.61-9.1 12.36-8.92z" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-2) 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
            <span className="text-muted" style={{ fontSize: 11 }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          </div>

          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" className="input" type="email" placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" className="input" type="password" placeholder="••••••••" />
          </div>

          <button type="submit" formAction={loginWithEmail} className="btn btn-primary btn-block" style={{ marginTop: "var(--space-2)" }}>
            Log in
          </button>

          <p className="text-muted" style={{ fontSize: 12, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            Don&apos;t have an account? <Link href="/signup" style={{ fontWeight: 600 }}>Sign up</Link>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-2) 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
            <span className="text-muted" style={{ fontSize: 11 }}>TRY THE DEMO</span>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          </div>

          <button type="submit" formAction={loginAsStudent} className="btn btn-secondary btn-block">
            Log in as demo applicant
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-2) 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
            <span className="text-muted" style={{ fontSize: 11 }}>STAFF LOGIN</span>
            <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          </div>

          <button type="submit" formAction={loginAsAdmin} className="btn btn-secondary btn-block">
            Log in as program admin
          </button>
          <button type="submit" formAction={loginAsScreener} className="btn btn-secondary btn-block">
            Log in as paper screener
          </button>
          <button type="submit" formAction={loginAsSuperAdmin} className="btn btn-secondary btn-block">
            Log in as super admin
          </button>

          <p className="text-muted" style={{ fontSize: 11, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            Demo/staff logins — no real credentials required.
          </p>
        </form>
      </div>
    </div>
  );
}
