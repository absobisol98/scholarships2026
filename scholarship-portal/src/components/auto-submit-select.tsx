"use client";

// A <select> inside a GET <form> that submits itself the moment a new option is chosen —
// matches how the .seg segmented links it replaces used to apply instantly on click,
// instead of waiting for the form's Search button.
export function AutoSubmitSelect({
  id,
  name,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      name={name}
      className="input"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
