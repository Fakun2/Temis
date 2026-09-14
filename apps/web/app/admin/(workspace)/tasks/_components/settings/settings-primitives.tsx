"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SettingsIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function SettingsSectionLabel({ children }: { children: ReactNode }) {
  return <span className="px-1 text-[10px] font-semibold text-muted-foreground">{children}</span>;
}

export function SettingsReadOnlyRow({
  icon: Icon,
  label,
  value
}: {
  icon: SettingsIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-7 items-center gap-2 rounded-md bg-secondary/35 px-2 text-[11px] text-foreground">
      <Icon className="size-3.5 text-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="max-w-32 truncate text-muted-foreground">{value}</span>
      <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

export function SettingsToggleRow({
  checked,
  icon: Icon,
  label,
  onCheckedChange
}: {
  checked: boolean;
  icon: SettingsIcon;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      className="flex h-7 items-center gap-2 rounded-md bg-secondary/35 px-2 text-left text-[11px] text-foreground hover:bg-secondary/50"
      type="button"
      onClick={() => onCheckedChange(!checked)}
    >
      <Icon className="size-3.5 text-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function SettingsHeader({
  onBack,
  onClose,
  title
}: {
  onBack?: () => void;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex h-7 items-center gap-2">
      {onBack ? (
        <button
          className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary/60"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
        </button>
      ) : null}
      <h2 className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{title}</h2>
      <button
        className="grid size-6 place-items-center rounded-full bg-secondary/70 text-muted-foreground hover:text-foreground"
        type="button"
        onClick={onClose}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsSearch({
  onChange,
  placeholder,
  value
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="flex h-8 items-center rounded-md border border-primary bg-background px-2 ring-1 ring-primary">
      <Search className="size-3 text-muted-foreground" aria-hidden="true" />
      <Input
        autoFocus
        className="h-6 border-0 bg-transparent px-2 text-[11px] shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SettingsRow({
  disabled,
  icon: Icon,
  label,
  onSelect,
  value
}: {
  disabled?: boolean;
  icon: SettingsIcon;
  label: string;
  onSelect?: () => void;
  value?: string;
}) {
  return (
    <button
      className="flex h-7 items-center gap-2 rounded-md px-1 text-left text-[11px] text-foreground hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      <Icon className="size-3.5 text-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value ? <span className="max-w-24 truncate text-muted-foreground">{value}</span> : null}
      <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
