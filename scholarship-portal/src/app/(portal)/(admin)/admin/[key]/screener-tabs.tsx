"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Paper screener administration splits in two: the roster of individual people (import,
// onboarding, accounts) and the panels they're organised into. Same segmented-control
// pattern the student program tabs use.
export function ScreenerTabs({ programKey }: { programKey: string }) {
  const pathname = usePathname();
  const onGroups = pathname.includes("/screener-groups");

  return (
    <div className="seg" role="radiogroup" aria-label="Paper screener section" style={{ margin: "var(--space-4) 0 var(--space-6)" }}>
      <label className="seg-opt">
        <input type="radio" name="screener-tab" checked={!onGroups} readOnly />
        <Link href={`/admin/${programKey}/screeners`} style={{ color: "inherit", textDecoration: "none" }}>Paper Screeners</Link>
      </label>
      <label className="seg-opt">
        <input type="radio" name="screener-tab" checked={onGroups} readOnly />
        <Link href={`/admin/${programKey}/screener-groups`} style={{ color: "inherit", textDecoration: "none" }}>Screener Groups</Link>
      </label>
    </div>
  );
}
