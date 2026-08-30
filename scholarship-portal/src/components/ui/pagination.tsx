import Link from "next/link";

// Numbered-page windowing: always show page 1, the last page, and a run around the current
// page, collapsing everything else into a single "…" — the standard pattern so a 40-page
// list doesn't render 40 buttons. Returns a mix of page numbers and the literal "…" string
// (deduplicated — adjacent numbers never leave a 1-page gap that would otherwise read as its
// own "…").
function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

// Numbered pages + prev/next chevrons, replacing the text-only Previous/Next link pair
// hand-rolled per admin table page. Pure server-renderable — every page is a real link
// (`hrefForPage`), not client state, so it works the same with or without JS and is a real
// URL a user can bookmark/share.
export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <PageLink page={page - 1} href={hrefForPage(page - 1)} disabled={page <= 1} aria-label="Previous page" chevron="prev" />
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">…</span>
        ) : (
          <PageLink key={p} page={p} href={hrefForPage(p)} active={p === page} aria-label={`Page ${p}`} />
        )
      )}
      <PageLink page={page + 1} href={hrefForPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" chevron="next" />
    </nav>
  );
}

function PageLink({
  page,
  href,
  active,
  disabled,
  chevron,
  "aria-label": ariaLabel,
}: {
  page: number;
  href: string;
  active?: boolean;
  disabled?: boolean;
  chevron?: "prev" | "next";
  "aria-label": string;
}) {
  const content = chevron ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {chevron === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  ) : (
    page
  );

  if (disabled) {
    return (
      <span className="pagination-item pagination-item-disabled" aria-hidden="true">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={active ? "pagination-item pagination-item-active" : "pagination-item"}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}
