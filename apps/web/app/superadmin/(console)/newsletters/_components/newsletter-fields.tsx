"use client";

import { Input } from "@/components/ui/input";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
export function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          value={value}
          className="h-9 w-12 shrink-0 rounded border"
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          className="min-w-0 flex-1"
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}
