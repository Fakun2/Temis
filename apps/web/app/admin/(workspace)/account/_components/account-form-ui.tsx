"use client";

import { useState, type ReactNode } from "react";
import { Edit3, Eye, EyeOff, Save, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const accountInputClassName =
  "h-11 rounded-2xl border-border/40 bg-card px-3 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10 sm:h-12 sm:px-4";

export const accountControlCardClassName =
  "flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-border/40 bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-secondary/30 sm:min-h-12 sm:gap-3 sm:px-4 sm:py-3";

type AccountCardProps = {
  actionLabel?: string;
  children: ReactNode;
  editDisabled?: boolean;
  editDisabledTooltip?: string;
  editing: boolean;
  icon: typeof UserRound;
  id: string;
  onCancel: () => void;
  onEdit: () => void;
  saving: boolean;
  title: string;
};

export function AccountCard({
  actionLabel = "Editar",
  children,
  editDisabled,
  editDisabledTooltip,
  editing,
  icon: Icon,
  id,
  onCancel,
  onEdit,
  saving,
  title
}: AccountCardProps) {
  const editButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-disabled={editDisabled}
      className={editDisabled ? "cursor-not-allowed opacity-60" : undefined}
      onClick={(event) => {
        if (editDisabled) {
          event.preventDefault();
          return;
        }

        onEdit();
      }}
    >
      <Edit3 className="h-4 w-4" aria-hidden="true" />
      {actionLabel}
    </Button>
  );

  return (
    <Card id={id} className="scroll-mt-20 border-border/60 bg-card shadow-sm">
      <CardContent className="grid min-w-0 gap-4 p-3 sm:gap-5 sm:p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-btn-secondary text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h2>
          </div>
          {editing ? (
            <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
              <X className="h-4 w-4" aria-hidden="true" />
              Cancelar
            </Button>
          ) : (
            <DisabledActionTooltip label={editDisabledTooltip} enabled={Boolean(editDisabled)}>
              {editButton}
            </DisabledActionTooltip>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function DisabledActionTooltip({
  children,
  enabled,
  label
}: {
  children: ReactNode;
  enabled: boolean;
  label?: string;
}) {
  if (!enabled || !label) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={80}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SectionActions({
  saving,
  savingLabel = "Guardando"
}: {
  saving: boolean;
  savingLabel?: string;
}) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={saving}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {saving ? savingLabel : "Guardar cambios"}
      </Button>
    </div>
  );
}

export function AccountField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function CheckboxField({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className={accountControlCardClassName}>
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      {label}
    </label>
  );
}

export function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
      {error}
    </p>
  );
}

export function PasswordInput({
  autoComplete,
  onChange,
  value
}: {
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        autoComplete={autoComplete}
        className={`${accountInputClassName} w-full pr-12`}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        className="absolute inset-y-1.5 right-1.5 flex h-auto w-9 items-center justify-center rounded-xl border-transparent bg-transparent p-0 text-muted-foreground shadow-none hover:bg-secondary/60 hover:text-foreground"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
