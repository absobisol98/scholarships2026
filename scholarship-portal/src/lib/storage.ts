import "server-only";
import { createClient } from "@supabase/supabase-js";

// Thin wrapper over Supabase Storage — server-side only (service-role key), never exposed
// to the browser. Uploads happen inside a Server Action's request body, not direct
// browser-to-Supabase, so the key never needs to leave the server.
function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured — document storage is unavailable.");
  return createClient(url, key);
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "application-documents";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Stores under app-{applicationId}/{field}/{timestamp}-{sanitized original name} — the
// timestamp keeps re-uploads from colliding, and the sanitized name tail stays readable so
// certFileName/videoFileName can still recover a display name from the path alone.
export async function uploadDocument(applicationId: number, field: "cert" | "video", file: File): Promise<string> {
  const path = `app-${applicationId}/${field}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await client().storage.from(bucket()).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload document: ${error.message}`);
  return path;
}

// Recovers a human-readable name from a stored path's "{timestamp}-{sanitized name}" tail
// — used anywhere the UI needs to show what's on file without minting a signed URL.
export function displayFileName(path: string): string {
  const tail = path.split("/").pop() ?? path;
  const dashIndex = tail.indexOf("-");
  return dashIndex > 0 && /^\d+$/.test(tail.slice(0, dashIndex)) ? tail.slice(dashIndex + 1) : tail;
}

// Mints a fresh, short-lived signed URL — never bake one into server-rendered HTML, since
// a stale link embedded in a revisited page would silently 403 once it expires.
export async function getSignedDocumentUrl(path: string, expiresInSeconds = 60): Promise<string> {
  const { data, error } = await client().storage.from(bucket()).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Failed to sign document URL: ${error?.message ?? "unknown error"}`);
  return data.signedUrl;
}
