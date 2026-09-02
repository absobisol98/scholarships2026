"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProgramTabs({ programKey, showGradeCheck }: { programKey: string; showGradeCheck?: boolean }) {
  const pathname = usePathname();
  const isApplication = pathname.endsWith("/application");
  const isStatus = pathname.endsWith("/status");
  const isGradeCheck = pathname.includes("/grade-check");

  return (
    <div className="seg" role="radiogroup" aria-label="Program section" style={{ margin: "var(--space-4) 0" }}>
      <label className="seg-opt">
        <input type="radio" name="ptab" checked={isApplication} readOnly />
        <Link href={`/programs/${programKey}/application`} style={{ color: "inherit", textDecoration: "none" }}>Application form</Link>
      </label>
      <label className="seg-opt">
        <input type="radio" name="ptab" checked={isStatus} readOnly />
        <Link href={`/programs/${programKey}/status`} style={{ color: "inherit", textDecoration: "none" }}>Status</Link>
      </label>
      {showGradeCheck && (
        <label className="seg-opt">
          <input type="radio" name="ptab" checked={isGradeCheck} readOnly />
          <Link href={`/programs/${programKey}/grade-check`} style={{ color: "inherit", textDecoration: "none" }}>Grade Check</Link>
        </label>
      )}
    </div>
  );
}
