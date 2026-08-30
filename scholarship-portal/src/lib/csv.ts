// Minimal RFC-4180-safe CSV writer — small enough not to justify a dependency for it.
export function csvEscape(value: string): string {
  // Formula injection: Excel/Sheets treats a cell starting with =, +, -, or @ as a formula
  // to evaluate on open. Every value here can originate from an applicant's own form input
  // (name, school, phone, ...), so a value like `=HYPERLINK("http://evil.example/")` would
  // otherwise execute in a staff member's spreadsheet the moment they open the export. A
  // leading apostrophe is the standard neutralizer — both Excel and Sheets render it as
  // literal text and strip the apostrophe itself from the display, so this doesn't corrupt
  // genuine values (a name can't legitimately start with `=`/`+`/`-`/`@` anyway).
  const neutralized = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(neutralized) ? `"${neutralized.replace(/"/g, '""')}"` : neutralized;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => csvEscape(c.label)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(String(r[c.key] ?? ""))).join(","));
  return lines.join("\r\n");
}
