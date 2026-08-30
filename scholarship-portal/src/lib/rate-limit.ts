import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Best-effort client IP for rate-limit keying. `x-forwarded-for`'s left-most entry is the
// original client per the usual reverse-proxy convention (Vercel, most load balancers) —
// trustworthy only when the app sits behind an infrastructure that sets this header itself
// and strips/overwrites any client-supplied one; a self-hosted deployment with no such proxy
// would let a client forge this. Not a concern for what this key is used for (slowing down
// repeated attempts, not identity), and "unknown" degrades to one shared bucket rather than
// throwing.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

// Self-contained, Postgres-backed rate limiting — no external service (Redis, etc.) to
// provision. Counts recent RateLimitAttempt rows for a key within the window; records
// this attempt only if under the limit, and opportunistically prunes that key's rows
// once they age out of the window so the table stays bounded without a separate cron.
export async function checkRateLimit(key: string, opts: { max: number; windowSeconds: number }): Promise<boolean> {
  const windowStart = new Date(Date.now() - opts.windowSeconds * 1000);
  const count = await db.rateLimitAttempt.count({ where: { key, createdAt: { gte: windowStart } } });
  if (count >= opts.max) return false;

  await db.rateLimitAttempt.create({ data: { key } });
  db.rateLimitAttempt.deleteMany({ where: { key, createdAt: { lt: windowStart } } }).catch(() => {});
  return true;
}

// signup-ip/login-ip above are keyed on (ip, email) — deliberately, so a shared IP (a school
// lab, an office NAT) never gets one member's retries counted against another's. But that
// means nothing anywhere limits raw account-creation *volume* from a single source: an IP
// cycling through many distinct emails sails through both existing limiters untouched. This
// is the coarser backstop for that gap — one shared ceiling, high enough not to punish a
// real shared-IP classroom signing up together, low enough to slow a scripted flood. Shared
// by both real signup entry points (email/password and Google) so they can't be played
// against each other to double the effective ceiling.
export async function checkSignupVolumeLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`signup-ip-volume:${ip}`, { max: 30, windowSeconds: 600 });
}
