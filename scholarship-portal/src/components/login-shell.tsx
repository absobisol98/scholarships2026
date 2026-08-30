import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// Shared by all four role doors (/, /screener, /admin, /super_admin). Each passes its own
// kicker/heading and bound login action; only the applicant door opts into Google and the
// demo shortcut, so those are props rather than baked in.
export const LOGIN_ERRORS: Record<string, string> = {
  admin_deactivated: "This Program Admin account has been deactivated by a Super Admin.",
  screener_deactivated: "This Paper Screener account has been deactivated by a Super Admin.",
  super_admin_deactivated: "This Super Admin account has been deactivated.",
  no_account: "No account found with that email.",
  wrong_door: "That account exists, but it isn't this kind of account. Use the sign-in page for your role.",
  missing_email: "Enter your email to log in.",
  google_auth_failed: "Google sign-in didn't complete. Please try again.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  wrong_password: "Incorrect password for that account.",
};

export function LoginShell({
  kicker,
  heading,
  blurb,
  action,
  error,
  notice,
  showPassword = false,
  showGoogle = false,
  demoAction,
  demoLabel,
  footer,
  otherDoors,
}: {
  kicker: string;
  heading: string;
  blurb?: string;
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  notice?: string;
  showPassword?: boolean;
  showGoogle?: boolean;
  demoAction?: () => void | Promise<void>;
  demoLabel?: string;
  footer?: React.ReactNode;
  otherDoors?: { label: string; href: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h6 style={{ color: "var(--color-accent)", textAlign: "center" }}>{kicker}</h6>
        <h2 style={{ textAlign: "center", marginBottom: blurb ? 4 : "var(--space-6)", fontSize: 30 }}>{heading}</h2>
        {blurb && (
          <p className="text-muted" style={{ textAlign: "center", fontSize: 13, marginBottom: "var(--space-6)" }}>{blurb}</p>
        )}

        {error && LOGIN_ERRORS[error] && (
          <Card role="alert" style={{ marginBottom: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>{LOGIN_ERRORS[error]}</CardBody>
          </Card>
        )}
        {notice && (
          <Card role="status" style={{ marginBottom: "var(--space-4)", background: "var(--color-accent-100)" }}>
            <CardBody>{notice}</CardBody>
          </Card>
        )}

        <Card elevation="md" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
          {showGoogle && (
            <>
              {/* A real navigation into a Route Handler that itself redirects off-site to
                  Google — plain <a>, not next/link, which would fight that with its own
                  client-side prefetch/navigation handling. */}
              <a href="/api/auth/google" className="btn btn-secondary btn-block" style={{ justifyContent: "flex-start", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v9h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.09c4.15-3.82 6.58-9.46 6.58-16.16z" />
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.34l-7.09-5.52c-1.97 1.32-4.5 2.1-7.47 2.1-5.75 0-10.62-3.88-12.36-9.1H4.34v5.7C7.96 40.98 15.4 46 24 46z" />
                  <path fill="#FBBC05" d="M11.64 28.14A13.9 13.9 0 0 1 10.8 24c0-1.44.25-2.83.7-4.14v-5.7H4.34A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.34 9.84z" />
                  <path fill="#EA4335" d="M24 10.94c3.24 0 6.15 1.11 8.44 3.29l6.28-6.28C34.9 4.18 29.93 2 24 2 15.4 2 7.96 7.02 4.34 14.16l7.3 5.7c1.74-5.22 6.61-9.1 12.36-8.92z" />
                </svg>
                Continue with Google
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-2) 0" }}>
                <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
                <span className="text-muted" style={{ fontSize: 11 }}>OR</span>
                <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
              </div>
            </>
          )}

          <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Field label="Email" htmlFor="login-email">
              <Input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
            </Field>
            {showPassword && (
              <Field label="Password" htmlFor="login-password">
                <Input id="login-password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
              </Field>
            )}
            <Button type="submit" variant="primary" block>Log in</Button>
          </form>

          {footer}

          {demoAction && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-2) 0" }}>
                <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
                <span className="text-muted" style={{ fontSize: 11 }}>TRY THE DEMO</span>
                <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
              </div>
              <form action={demoAction}>
                <Button type="submit" variant="secondary" block>{demoLabel ?? "Log in as demo user"}</Button>
              </form>
            </>
          )}
        </Card>

        {otherDoors && otherDoors.length > 0 && (
          <p className="text-muted" style={{ fontSize: 12, textAlign: "center", marginTop: "var(--space-4)" }}>
            {otherDoors.map((d, i) => (
              <span key={d.href}>
                {i > 0 && " · "}
                <Link href={d.href} style={{ fontWeight: 600 }}>{d.label}</Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
