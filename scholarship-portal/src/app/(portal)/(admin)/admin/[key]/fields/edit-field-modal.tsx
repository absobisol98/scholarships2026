"use client";

import { useState } from "react";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { AutoToggleCheckbox } from "@/components/auto-toggle-checkbox";
import { FieldTypeSelect } from "@/components/field-type-select";
import { OptionsEditor } from "./options-editor";

export function EditFieldModal({
  label,
  fieldType,
  enabled,
  required,
  options,
  onLabelChange,
  onTypeChange,
  onToggleEnabled,
  onToggleRequired,
  onAddOption,
  onRemoveOption,
}: {
  label: string;
  fieldType: string;
  enabled: boolean;
  required: boolean;
  options: string[];
  onLabelChange: (value: string) => Promise<void>;
  onTypeChange: (value: string) => Promise<void>;
  onToggleEnabled: () => Promise<void>;
  onToggleRequired: () => Promise<void>;
  onAddOption: (option: string) => Promise<void>;
  onRemoveOption: (option: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="link-edit" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        Edit
      </button>

      {open && (
        <div
          className="dialog-backdrop"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-field-title"
            style={{ width: "min(420px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-title" id="edit-field-title">Edit field</div>

            <div>
              <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Label</span>
              <div style={{ marginTop: 6 }}>
                <AutoSaveTextInput defaultValue={label} ariaLabel="Field label" action={onLabelChange} style={{ width: "100%" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</span>
                <div style={{ marginTop: 6 }}>
                  <FieldTypeSelect defaultValue={fieldType} ariaLabel="Field type" action={onTypeChange} />
                </div>
              </div>
              <AutoToggleCheckbox defaultChecked={enabled} label="Shown" action={onToggleEnabled} />
              <AutoToggleCheckbox defaultChecked={required} label="Required" action={onToggleRequired} />
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <OptionsEditor fieldType={fieldType} options={options} onAddOption={onAddOption} onRemoveOption={onRemoveOption} />
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn btn-primary" autoFocus onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
