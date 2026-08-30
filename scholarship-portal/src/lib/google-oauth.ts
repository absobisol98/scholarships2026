import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Real Google OAuth (Authorization Code flow) for the "Continue with Google" button —
// applicants only.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const OAUTH_STATE_COOKIE = "sp_oauth_state";

// createRemoteJWKSet caches Google's published signing keys (and respects their HTTP
// cache headers for refetching), so this doesn't do a network round trip on every login —
// only the first time a given key id is seen. Module-level so the cache is shared across
// requests in the same server process.
const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

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
// client_secret, so the practical exploit path for a forged token already required
// compromising Google's TLS or token endpoint — but verifying the signature against
// Google's published JWKS (rather than only decoding and trusting the claims) is the
// standard defense-in-depth here and costs one cached lookup, so there's no reason not to.
// jwtVerify itself checks the signature, `exp`, and (via the options below) `iss`/`aud` —
// the two claims underneath still need a manual check since they're app-specific meaning,
// not something a generic JWT verifier enforces on its own.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  const { clientId } = getGoogleOAuthEnv();
  let claims: Record<string, unknown>;
  try {
    const result = await jwtVerify(idToken, googleJwks, {
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      audience: clientId,
    });
    claims = result.payload;
  } catch {
    // Bad signature, expired, wrong issuer/audience, or malformed — all the same outcome.
    return null;
  }

  if (claims.email_verified !== true) return null;
  if (typeof claims.email !== "string") return null;

  return { email: claims.email, name: typeof claims.name === "string" ? claims.name : undefined };
}
