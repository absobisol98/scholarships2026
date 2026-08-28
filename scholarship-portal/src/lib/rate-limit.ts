import "server-only";
import { db } from "@/lib/db";

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
