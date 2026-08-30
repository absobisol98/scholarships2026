import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";
import { signUpAsStudent } from "@/app/login/actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

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
          <Card role="alert" style={{ marginBottom: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</CardBody>
          </Card>
        )}

        <form action={signUpAsStudent} className="card elev-md" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
          {/* Honeypot — invisible to a real applicant, filled in by naive auto-filling bots.
              Positioned off-screen rather than display:none (some bots skip hidden fields
              outright), excluded from tab order and screen readers, autocomplete off so a
              browser's own form-fill never populates it for a real user. */}
          <div style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
            <label htmlFor="signup-website">Website</label>
            <input id="signup-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <Field label="Full name" htmlFor="signup-name" required>
            <Input id="signup-name" name="name" placeholder="Juan Dela Cruz" required aria-required="true" />
          </Field>
          <Field label="Email" htmlFor="signup-email" required>
            <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required aria-required="true" />
          </Field>
          <Field label="Password" htmlFor="signup-password">
            <Input id="signup-password" name="password" type="password" placeholder="••••••••" />
          </Field>

          <Button type="submit" variant="primary" block style={{ marginTop: "var(--space-2)" }}>
            Create account
          </Button>

          <p className="text-muted" style={{ fontSize: 12, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            Already have an account? <Link href="/" style={{ fontWeight: 600 }}>Log in</Link>
          </p>

          <p className="text-muted" style={{ fontSize: 11, textAlign: "center", margin: "var(--space-2) 0 0" }}>
            No real credentials are stored in this demo — your account is identified by email only.
          </p>
        </form>
      </div>
    </div>
  );
}
