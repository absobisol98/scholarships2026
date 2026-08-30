"use client";

import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { AutoToggleCheckbox } from "@/components/auto-toggle-checkbox";
import { FieldTypeSelect } from "@/components/field-type-select";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OptionsEditor } from "./options-editor";

// Controlled — open/onClose live in the caller (FieldRowActions' RowMenu "Edit" item),
// rather than this component owning its own trigger button, so it fits inside a dropdown.
export function EditFieldModal({
  open,
  onClose,
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
  open: boolean;
  onClose: () => void;
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
  return (
    <>
      <Dialog open={open} onClose={onClose} titleId="edit-field-title" title="Edit field" width={420}>
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

        <DialogActions>
          <Button type="button" variant="primary" autoFocus onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
