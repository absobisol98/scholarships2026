import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { SetPasswordForm } from "./set-password-form";

export default async function SetScreenerPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const staff = await db.staffAccount.findFirst({ where: { inviteToken: token } });
  const valid = !!staff && !!staff.inviteTokenExpiresAt && staff.inviteTokenExpiresAt > new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h6 style={{ color: "var(--color-accent)", textAlign: "center" }}>SCHOLARSHIP MANAGEMENT SYSTEM</h6>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-6)", fontSize: 30 }}>Set your password</h2>

        <Card elevation="md" style={{ padding: "var(--space-6)" }}>
          {valid ? (
            <>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
                Welcome, {staff!.name}. Choose a password for your Paper Screener account ({staff!.email}).
              </p>
              <SetPasswordForm token={token} />
            </>
          ) : (
            <CardBody style={{ margin: 0 }}>
              This link is invalid or has expired. Ask an admin to generate a new one.
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
