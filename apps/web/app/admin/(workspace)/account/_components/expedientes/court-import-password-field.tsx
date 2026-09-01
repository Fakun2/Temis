"use client";

import { memo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountInputClassName } from "../account-form-ui";

export const CourtImportPasswordField = memo(function CourtImportPasswordField({
  disabled,
  id,
  label,
  onChange,
  value
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          className={`${accountInputClassName} w-full pr-12`}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          className="absolute inset-y-1.5 right-1.5 flex h-auto w-9 items-center justify-center rounded-xl border-transparent bg-transparent p-0 text-muted-foreground shadow-none hover:bg-secondary/60 hover:text-foreground"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});
