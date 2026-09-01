"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useAccountPasswordForm } from "../_hooks/use-account-password-form";
import {
  AccountCard,
  AccountField,
  PasswordInput,
  SectionActions,
  SectionError
} from "./account-form-ui";

type SecuritySectionProps = {
  hasPassword: boolean;
};

export function SecuritySection({ hasPassword }: SecuritySectionProps) {
  const form = useAccountPasswordForm({ hasPassword });
  const title = hasPassword ? "Cambiar contraseña" : "Crear contraseña";

  return (
    <AccountCard
      id="security"
      title="Seguridad"
      icon={ShieldCheck}
      editing
      saving={form.isSaving || form.isValidating}
      onCancel={form.reset}
      onEdit={() => undefined}
    >
      <form className="grid gap-5" onSubmit={form.requestSave}>
        <div className="grid gap-4 md:grid-cols-2">
          {hasPassword ? (
            <AccountField label="Contraseña actual">
              <PasswordInput
                autoComplete="current-password"
                value={form.draft.currentPassword ?? ""}
                onChange={(value) => form.setDraft({ ...form.draft, currentPassword: value })}
              />
            </AccountField>
          ) : null}
          <AccountField label="Nueva contraseña">
            <PasswordInput
              autoComplete="new-password"
              value={form.draft.newPassword}
              onChange={(value) => form.setDraft({ ...form.draft, newPassword: value })}
            />
          </AccountField>
        </div>
        <p className="text-xs text-muted-foreground">
          La nueva contraseña debe tener al menos 8 caracteres e incluir letras y numeros.
        </p>
        <SectionError error={form.error} />
        <SectionActions
          saving={form.isSaving || form.isValidating}
          savingLabel={form.isValidating ? "Validando" : "Guardando"}
        />
      </form>

      <Dialog open={form.confirmOpen} onOpenChange={form.setConfirmOpen}>
        <DialogContent className="max-w-md" showCloseButton={!form.isSaving}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Al {hasPassword ? "cambiar" : "crear"} la contraseña se cerrara tu sesion de Justinia
              y tendras que volver a ingresar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={form.isSaving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={form.confirmSave} disabled={form.isSaving}>
              {form.isSaving ? "Guardando" : title}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AccountCard>
  );
}
