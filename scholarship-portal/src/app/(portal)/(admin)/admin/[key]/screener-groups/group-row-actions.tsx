"use client";

import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";

const ICONS = {
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  ),
};

// A Server Component can pass a bound Server Action down as a prop, but it can't define the
// onClick closure that calls it with zero args — that closure isn't itself a Server Action,
// so it can't cross the server->client boundary. This one-purpose client wrapper is where
// that closure actually lives (same pattern as field-row-actions.tsx/program-row-actions.tsx).
export function GroupRowActions({ groupName, onDeleteGroup }: { groupName: string; onDeleteGroup: () => void | Promise<void> }) {
  return (
    <RowMenu label={`Actions for ${groupName}`}>
      <RowMenuItem danger icon={ICONS.trash} onClick={() => onDeleteGroup()}>
        Delete group
      </RowMenuItem>
    </RowMenu>
  );
}
