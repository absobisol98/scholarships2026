"use client";

import { useState } from "react";
import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";
import { EditFieldModal } from "./edit-field-modal";

const ICONS = {
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  ),
};

export function FieldRowActions({
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
  onRemoveField,
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
  onRemoveField: (formData: FormData) => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <RowMenu label={`Actions for field: ${label}`}>
        <RowMenuItem icon={ICONS.edit} onClick={() => setEditOpen(true)}>
          Edit
        </RowMenuItem>
        <RowMenuItem danger icon={ICONS.trash} onClick={() => onRemoveField(new FormData())}>
          Delete
        </RowMenuItem>
      </RowMenu>

      <EditFieldModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        label={label}
        fieldType={fieldType}
        enabled={enabled}
        required={required}
        options={options}
        onLabelChange={onLabelChange}
        onTypeChange={onTypeChange}
        onToggleEnabled={onToggleEnabled}
        onToggleRequired={onToggleRequired}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
      />
    </>
  );
}
