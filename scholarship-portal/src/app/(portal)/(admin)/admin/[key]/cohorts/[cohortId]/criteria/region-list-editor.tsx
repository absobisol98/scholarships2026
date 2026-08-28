"use client";

import { useState, useTransition } from "react";
import { Tag } from "@/components/ui/tag";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function RegionListEditor({
  regionMap,
  onAdd,
  onRemove,
}: {
  regionMap: Record<string, string[]>;
  onAdd: (region: string, province: string) => Promise<void>;
  onRemove: (region: string, province: string) => Promise<void>;
}) {
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [isPending, startTransition] = useTransition();
  const regions = Object.keys(regionMap);

  return (
    <div>
      {regions.length === 0 && (
        <p className="text-muted" style={{ fontSize: 12, margin: "0 0 8px" }}>No provinces nominated yet.</p>
      )}
      {regions.map((r) => (
        <div key={r} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>{r}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {regionMap[r].map((p) => (
              <Tag key={p} variant="neutral" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {p}
                <button
                  type="button"
                  aria-label={`Remove ${p} from ${r}`}
                  disabled={isPending}
                  onClick={() => startTransition(() => onRemove(r, p))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 14, lineHeight: 1 }}
                >
                  ×
                </button>
              </Tag>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <Input
          placeholder="Region (e.g. Luzon)"
          aria-label="New region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ maxWidth: 150 }}
        />
        <Input
          placeholder="Province"
          aria-label="New province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          style={{ maxWidth: 170 }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={isPending || !region.trim() || !province.trim()}
          onClick={() =>
            startTransition(async () => {
              await onAdd(region, province);
              setRegion("");
              setProvince("");
            })
          }
        >
          + Add
        </Button>
      </div>
    </div>
  );
}
