import "server-only";

// Real Google OAuth (Authorization Code flow) for the "Continue with Google" button —
// applicants only. No new dependency: the id_token is decoded directly (see
// decodeGoogleIdToken below) rather than verified against Google's JWKS, matching this
// app's existing "no real credentials in this demo" posture (see session.ts).

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_STATE_COOKIE = "sp_oauth_state";

function getGoogleOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set");
  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getGoogleOAuthEnv();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online"); // no refresh token — we never call Google again
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ id_token: string }> {
  const { clientId, clientSecret } = getGoogleOAuthEnv();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json();
}

export type GoogleIdentity = { email: string; name?: string };

// The id_token arrives via a direct server-to-server HTTPS call authenticated with our
// client_secret — it never passes through the browser, so it carries the same trust as
// any other response on that connection. We still sanity-check the claims (issuer,
// audience, expiry, verified email) but skip JWKS signature verification, which would add
// a dependency and a round-trip this internal/demo-tier app doesn't need.
export function decodeGoogleIdToken(idToken: string): GoogleIdentity | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const { clientId } = getGoogleOAuthEnv();
  if (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com") return null;
  if (claims.aud !== clientId) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return null;
  if (claims.email_verified !== true) return null;
  if (typeof claims.email !== "string") return null;

  return { email: claims.email, name: typeof claims.name === "string" ? claims.name : undefined };
}
