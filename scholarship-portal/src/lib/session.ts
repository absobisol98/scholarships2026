// Demo-login session: a signed cookie holding just a role. There are no real
// credentials in this app ("Log in as applicant" / "Log in as admin" work for
// anyone) — the signature only stops a viewer from hand-editing the cookie to
// grant themselves a staff role. Uses Web Crypto so it also runs in the
// Edge middleware runtime.

export type Role = "student" | "admin" | "super_admin" | "screener";
const ROLES: Role[] = ["student", "admin", "super_admin", "screener"];

export const SESSION_COOKIE = "sp_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function base64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(sig);
}

export type SessionData = { role: Role; studentId?: number; staffId?: string };

// studentId/staffId point a real signed-up (or logged-in-by-email) account's session back to
// its own Student/StaffAccount row, instead of everyone sharing the role's demo persona. The
// demo "Log in as ..." shortcuts still set these too, just to the fixed demo row for that role.
export async function createSessionCookieValue(role: Role, studentId?: number, staffId?: string): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ role, studentId, staffId })).toString("base64url");
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionCookieValue(value: string | undefined): Promise<SessionData | null> {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (ROLES.includes(parsed.role)) {
      return {
        role: parsed.role,
        studentId: typeof parsed.studentId === "number" ? parsed.studentId : undefined,
        staffId: typeof parsed.staffId === "string" ? parsed.staffId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
