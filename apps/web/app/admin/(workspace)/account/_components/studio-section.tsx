"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { argentinaProvinces } from "@/lib/constants/argentina-provinces";
import { accountStudioSchema, type AccountStudioFormValues } from "@/lib/validation/account";
import { useAccountStudioMutation } from "../_hooks/use-account-mutations";
import type { AccountResponse } from "../_types/account.types";
import { toStudioDraft } from "../_utils/account-drafts";
import { getErrorMessage } from "../_utils/account-format";
import { AccountCard, InfoGrid, accountInputClassName } from "./account-form-ui";

export function StudioSection({ account }: { account: AccountResponse }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const mutation = useAccountStudioMutation();

  return (
    <>
      <AccountCard
        id="studio"
        title="Estudio y direccion"
        icon={Building2}
        editing={false}
        saving={mutation.isPending}
        editDisabled={!account.permissions.canManageStudio}
        onCancel={() => setDialogOpen(false)}
        onEdit={() => setDialogOpen(true)}
      >
        <div className="grid gap-5">
          <InfoGrid
            items={[
              ["Nombre del estudio", account.studio.name],
              ["Razon social", account.studio.legalName ?? "Sin razon social"],
              ["CUIT / Tax ID", account.studio.taxId ?? "Sin dato"],
              ["Sitio web", account.studio.website ?? "Sin sitio web"],
              ["Pais", account.studio.country || "Sin dato"],
              ["Provincia", account.studio.province || "Sin dato"],
              ["Ciudad", account.studio.city || "Sin dato"],
              ["Direccion", account.studio.address ?? "Sin direccion"]
            ]}
          />
        </div>
      </AccountCard>

      <StudioEditDialog
        account={account}
        mutation={mutation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function StudioEditDialog({
  account,
  mutation,
  open,
  onOpenChange
}: {
  account: AccountResponse;
  mutation: ReturnType<typeof useAccountStudioMutation>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<AccountStudioFormValues>(() => toStudioDraft(account));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(toStudioDraft(account));
    setError(undefined);
  }, [account, open]);

  async function saveStudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = accountStudioSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del estudio.");
      return;
    }

    setError(undefined);
    try {
      await mutation.mutateAsync(parsed.data);
      onOpenChange(false);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(560px,calc(100vw-2rem))] gap-0 overflow-y-auto rounded-[1.35rem] border-border/70 bg-card p-0 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.62)]">
        <form className="grid gap-4 p-4 sm:gap-5 sm:p-6" onSubmit={saveStudio}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-foreground">
              Editar estudio
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/35">
            <StudioDialogField label="Nombre del estudio">
              <Input
                className={accountInputClassName}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </StudioDialogField>
            <StudioDialogField label="Razon social">
              <Input
                className={accountInputClassName}
                value={draft.legalName ?? ""}
                onChange={(event) => setDraft({ ...draft, legalName: event.target.value })}
              />
            </StudioDialogField>
            <StudioDialogField label="CUIT / Tax ID">
              <Input
                className={accountInputClassName}
                inputMode="numeric"
                maxLength={11}
                pattern="[0-9]*"
                value={draft.taxId ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, taxId: event.target.value.replace(/\D/g, "") })
                }
              />
            </StudioDialogField>
            <StudioDialogField label="Sitio web">
              <Input
                className={accountInputClassName}
                value={draft.website ?? ""}
                onChange={(event) => setDraft({ ...draft, website: event.target.value })}
              />
            </StudioDialogField>
            <StudioDialogField label="Pais">
              <Input
                className={accountInputClassName}
                value={draft.country}
                onChange={(event) => setDraft({ ...draft, country: event.target.value })}
              />
            </StudioDialogField>
            <StudioDialogField label="Provincia">
              <Select
                value={draft.province || undefined}
                onValueChange={(value) => setDraft({ ...draft, province: value })}
              >
                <SelectTrigger className={accountInputClassName}>
                  <SelectValue placeholder="Seleccionar provincia" />
                </SelectTrigger>
                <SelectContent align="start" position="popper">
                  {argentinaProvinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StudioDialogField>
            <StudioDialogField label="Ciudad">
              <Input
                className={accountInputClassName}
                value={draft.city}
                onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              />
            </StudioDialogField>
            <StudioDialogField label="Direccion">
              <Input
                className={accountInputClassName}
                value={draft.address ?? ""}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              />
            </StudioDialogField>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl px-6" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudioDialogField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2.5 border-b border-border/50 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_240px] sm:items-center">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}
