"use client";

import { memo, type FormEvent } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SaePreviewFormValues } from "@/lib/validation/account";
import { cn } from "@/lib/utils";
import { SectionError, accountInputClassName } from "../account-form-ui";
import { CourtImportPasswordField } from "./court-import-password-field";

type CourtImportFormProps = {
  busy: boolean;
  collapsed: boolean;
  form: SaePreviewFormValues;
  formError?: string;
  onFieldChange: (field: keyof SaePreviewFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const CourtImportForm = memo(function CourtImportForm({
  busy,
  collapsed,
  form,
  formError,
  onFieldChange,
  onSubmit
}: CourtImportFormProps) {
  return (
    <form
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed
          ? "pointer-events-none -mt-4 grid-rows-[0fr] -translate-y-2 opacity-0"
          : "grid-rows-[1fr] translate-y-0 opacity-100"
      )}
      onSubmit={onSubmit}
      aria-hidden={collapsed}
    >
      <div className="grid min-h-0 gap-4 overflow-hidden">
        <p className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
          Las credenciales se usan solo para esta busqueda y no se guardan.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sae-username">Usuario / CUIL</Label>
            <Input
              id="sae-username"
              className={accountInputClassName}
              autoComplete="username"
              placeholder="Cuil o usuario"
              value={form.username}
              onChange={(event) => onFieldChange("username", event.target.value)}
              disabled={busy}
            />
          </div>
          <CourtImportPasswordField
            id="sae-password"
            label="Contraseña"
            value={form.password}
            disabled={busy}
            onChange={(value) => onFieldChange("password", value)}
          />
        </div>

        <SectionError error={formError} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={busy}>
            {busy && !collapsed ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSearch className="h-4 w-4" aria-hidden="true" />
            )}
            Buscar expedientes
          </Button>
        </div>
      </div>
    </form>
  );
});
