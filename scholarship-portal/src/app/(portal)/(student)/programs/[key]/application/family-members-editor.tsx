"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

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
          <Field label="Full name" htmlFor={`fm-name-${i}`} style={{ flex: 1, marginBottom: 0 }}>
            <Input id={`fm-name-${i}`} name={`fm-name-${i}`} placeholder="Full name" defaultValue={m.name} />
          </Field>
          <Field label="Relationship" htmlFor={`fm-rel-${i}`} style={{ flex: 1, marginBottom: 0 }}>
            <Input id={`fm-rel-${i}`} name={`fm-rel-${i}`} placeholder="Sibling, grandparent..." defaultValue={m.relationship} />
          </Field>
          <Field label="Occupation" htmlFor={`fm-occ-${i}`} style={{ flex: 1, marginBottom: 0 }}>
            <Input id={`fm-occ-${i}`} name={`fm-occ-${i}`} placeholder="Occupation" defaultValue={m.occupation} />
          </Field>
          {members.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Remove this family member"
              onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setMembers((prev) => [...prev, { key: `new-${Date.now()}`, name: "", relationship: "", occupation: "" }])}
      >
        + Add family member
      </Button>
    </div>
  );
}
