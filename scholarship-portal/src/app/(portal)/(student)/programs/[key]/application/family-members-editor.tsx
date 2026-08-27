"use client";

import { useState } from "react";

type Member = { key: string; name: string; relationship: string; occupation: string };

export function FamilyMembersEditor({ initialMembers }: { initialMembers: { name: string; relationship: string; occupation: string }[] }) {
  const [members, setMembers] = useState<Member[]>(
    initialMembers.length
      ? initialMembers.map((m, i) => ({ key: `existing-${i}`, ...m }))
      : [{ key: "new-0", name: "", relationship: "", occupation: "" }]
  );

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 var(--space-2)" }}>Additional family members</p>
      <input type="hidden" name="familyMemberCount" value={members.length} />
      {members.map((m, i) => (
        <div key={m.key} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", marginBottom: "var(--space-3)" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor={`fm-name-${i}`}>Full name</label>
            <input
              id={`fm-name-${i}`}
              name={`fm-name-${i}`}
              className="input"
              placeholder="Full name"
              defaultValue={m.name}
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor={`fm-rel-${i}`}>Relationship</label>
            <input
              id={`fm-rel-${i}`}
              name={`fm-rel-${i}`}
              className="input"
              placeholder="Sibling, grandparent..."
              defaultValue={m.relationship}
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor={`fm-occ-${i}`}>Occupation</label>
            <input
              id={`fm-occ-${i}`}
              name={`fm-occ-${i}`}
              className="input"
              placeholder="Occupation"
              defaultValue={m.occupation}
            />
          </div>
          {members.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Remove this family member"
              onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setMembers((prev) => [...prev, { key: `new-${Date.now()}`, name: "", relationship: "", occupation: "" }])}
      >
        + Add family member
      </button>
    </div>
  );
}
