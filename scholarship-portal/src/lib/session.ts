// Demo-login session: a signed cookie holding just a role. There are no real
// credentials in this app ("Log in as applicant" / "Log in as admin" work for
// anyone) — the signature only stops a viewer from hand-editing the cookie to
// grant themselves the admin role. Uses Web Crypto so it also runs in the
// Edge middleware runtime.

export type Role = "student" | "admin";

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

export async function createSessionCookieValue(role: Role): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionCookieValue(value: string | undefined): Promise<{ role: Role } | null> {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.role === "student" || parsed.role === "admin") return { role: parsed.role };
    return null;
  } catch {
    return null;
  }
}
