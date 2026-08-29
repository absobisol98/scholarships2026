// Minimal RFC-4180-safe CSV writer — small enough not to justify a dependency for it.
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => csvEscape(c.label)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(String(r[c.key] ?? ""))).join(","));
  return lines.join("\r\n");
}
