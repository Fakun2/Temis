"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2, Loader2, Save, UserRound, UserRoundPlus } from "lucide-react";
import type {
  ClientDetailDto,
  ClientStatus,
  ClientType,
  ClientsControllerCreateBody,
  ClientsControllerUpdateBody
} from "@temis/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AdminTableHeaderActionButton } from "../../_components/admin-table-header-action-button";
import {
  useClientDetailQuery,
  useCreateClientMutation,
  useUpdateClientMutation
} from "../_hooks/use-clients-query";

type ClientDraft = {
  address: string;
  age: string;
  businessName: string;
  cbu: string;
  cuil: string;
  cuit: string;
  dni: string;
  email: string;
  firstName: string;
  lastName: string;
  notes: string;
  phone: string;
  salaryReceiptRef: string;
  statute: string;
  status: Exclude<ClientStatus, "archived">;
  type: ClientType;
};

const emptyDraft: ClientDraft = {
  address: "",
  age: "",
  businessName: "",
  cbu: "",
  cuil: "",
  cuit: "",
  dni: "",
  email: "",
  firstName: "",
  lastName: "",
  notes: "",
  phone: "",
  salaryReceiptRef: "",
  statute: "",
  status: "active",
  type: "human"
};

const fieldClassName =
  "h-12 rounded-2xl border-border/40 bg-card px-4 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";
const selectClassName =
  "h-12 rounded-2xl border-border/40 bg-card px-4 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";
const textareaClassName =
  "min-h-24 resize-none rounded-2xl border-border/40 bg-card px-4 py-3 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";

export function ClientSheet({
  clientId,
  compact = false,
  open: controlledOpen,
  onSaved,
  onOpenChange,
  trigger
}: {
  clientId?: string;
  compact?: boolean;
  open?: boolean;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode | null;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const open = controlledOpen ?? uncontrolledOpen;
  const isEditing = Boolean(clientId);
  const detailQuery = useClientDetailQuery(clientId ?? "", { enabled: open && isEditing });
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();
  const mutation = isEditing ? updateMutation : createMutation;
  const loadedClient = detailQuery.data;
  const title = isEditing ? "Editar cliente" : "Nuevo cliente";
  const description = isEditing
    ? "Actualiza datos personales, contacto y estado operativo."
    : "Alta de una persona o empresa vinculada al estudio.";

  useEffect(() => {
    if (!open) {
      return;
    }
    setErrors({});
    if (!isEditing) {
      setDraft(emptyDraft);
      return;
    }
    if (loadedClient) {
      setDraft(toDraft(loadedClient));
    }
  }, [isEditing, loadedClient, open]);

  const isBusy = mutation.isPending || detailQuery.isLoading;
  const formError = mutation.error?.message ?? detailQuery.error?.message;
  const TypeIcon = draft.type === "human" ? UserRound : Building2;

  function setOpen(nextOpen: boolean) {
    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function updateDraft<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    if (isEditing && clientId) {
      await updateMutation.mutateAsync({ clientId, input: toUpdatePayload(draft) });
    } else {
      await createMutation.mutateAsync(toCreatePayload(draft));
    }
    setOpen(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger !== null ? (
        <SheetTrigger asChild>
          {trigger ?? (
            <AdminTableHeaderActionButton
              className={compact ? "mt-4" : undefined}
              icon={UserRoundPlus}
              label="Nuevo cliente"
              tone="primary"
            />
          )}
        </SheetTrigger>
      ) : null}
      <SheetContent className="w-[780px] max-w-[94vw] overflow-hidden border-border bg-card sm:max-w-[780px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-lg">
            <span className="flex size-9 items-center justify-center rounded-xl bg-btn-primary text-btn-primary-foreground">
              <TypeIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            {title}
          </SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 pb-1 md:grid-cols-2">
            {formError ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive md:col-span-2">
                {formError}
              </p>
            ) : null}

            {draft.type === "human" ? (
              <HumanFields
                draft={draft}
                errors={errors}
                isBusy={isBusy}
                updateDraft={updateDraft}
              />
            ) : (
              <LegalEntityFields
                draft={draft}
                errors={errors}
                isBusy={isBusy}
                updateDraft={updateDraft}
              />
            )}

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <ClientField error={errors.email} label="Email">
                <Input
                  autoComplete="email"
                  className={fieldClassName}
                  disabled={isBusy}
                  placeholder="cliente@ejemplo.com"
                  type="email"
                  value={draft.email}
                  onChange={(event) => updateDraft("email", event.target.value)}
                />
              </ClientField>
              <ClientField label="Telefono">
                <Input
                  autoComplete="tel"
                  className={fieldClassName}
                  disabled={isBusy}
                  placeholder="+54 381 555-0000"
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                />
              </ClientField>
            </div>

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <ClientField label="Direccion">
                <Input
                  autoComplete="street-address"
                  className={fieldClassName}
                  disabled={isBusy}
                  placeholder="Domicilio"
                  value={draft.address}
                  onChange={(event) => updateDraft("address", event.target.value)}
                />
              </ClientField>

              <ClientField error={errors.cbu} label="CBU">
                <Input
                  className={fieldClassName}
                  disabled={isBusy}
                  inputMode="numeric"
                  maxLength={22}
                  placeholder="22 digitos"
                  value={draft.cbu}
                  onChange={(event) => updateDraft("cbu", onlyDigits(event.target.value))}
                />
              </ClientField>
            </div>

            <ClientField label="Notas" className="md:col-span-2">
              <Textarea
                className={textareaClassName}
                disabled={isBusy}
                placeholder="Observaciones internas"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
              />
            </ClientField>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border/40 px-4 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Guardar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function TypeField({
  draft,
  isBusy,
  updateDraft
}: {
  draft: ClientDraft;
  isBusy: boolean;
  updateDraft: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <ClientField label="Tipo">
      <Select
        value={draft.type}
        onValueChange={(value) => updateDraft("type", value as ClientType)}
        disabled={isBusy}
      >
        <SelectTrigger className={selectClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="human">Persona</SelectItem>
          <SelectItem value="legal_entity">Empresa</SelectItem>
        </SelectContent>
      </Select>
    </ClientField>
  );
}

function StatusField({
  draft,
  isBusy,
  updateDraft
}: {
  draft: ClientDraft;
  isBusy: boolean;
  updateDraft: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <ClientField label="Estado">
      <Select
        value={draft.status}
        onValueChange={(value) => updateDraft("status", value as Exclude<ClientStatus, "archived">)}
        disabled={isBusy}
      >
        <SelectTrigger className={selectClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="inactive">Inactivo</SelectItem>
        </SelectContent>
      </Select>
    </ClientField>
  );
}

function HumanFields({
  draft,
  errors,
  isBusy,
  updateDraft
}: {
  draft: ClientDraft;
  errors: Record<string, string>;
  isBusy: boolean;
  updateDraft: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-4">
        <TypeField draft={draft} isBusy={isBusy} updateDraft={updateDraft} />
        <ClientField error={errors.firstName} label="Nombre" className="md:col-span-2" required>
          <Input
            autoComplete="given-name"
            className={fieldClassName}
            disabled={isBusy}
            value={draft.firstName}
            onChange={(event) => updateDraft("firstName", event.target.value)}
          />
        </ClientField>
        <StatusField draft={draft} isBusy={isBusy} updateDraft={updateDraft} />
      </div>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <ClientField error={errors.lastName} label="Apellido" required>
          <Input
            autoComplete="family-name"
            className={fieldClassName}
            disabled={isBusy}
            value={draft.lastName}
            onChange={(event) => updateDraft("lastName", event.target.value)}
          />
        </ClientField>
        <ClientField error={errors.age} label="Edad">
          <Input
            className={fieldClassName}
            disabled={isBusy}
            inputMode="numeric"
            maxLength={3}
            value={draft.age}
            onChange={(event) => updateDraft("age", onlyDigits(event.target.value))}
          />
        </ClientField>
      </div>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <ClientField error={errors.dni} label="DNI">
          <Input
            className={fieldClassName}
            disabled={isBusy}
            inputMode="numeric"
            maxLength={8}
            value={draft.dni}
            onChange={(event) => updateDraft("dni", onlyDigits(event.target.value))}
          />
        </ClientField>
        <ClientField error={errors.cuil} label="CUIL">
          <Input
            className={fieldClassName}
            disabled={isBusy}
            inputMode="numeric"
            maxLength={11}
            value={draft.cuil}
            onChange={(event) => updateDraft("cuil", onlyDigits(event.target.value))}
          />
        </ClientField>
      </div>
      <ClientField label="Recibo de sueldo" className="md:col-span-2">
        <Input
          className={fieldClassName}
          disabled={isBusy}
          value={draft.salaryReceiptRef}
          onChange={(event) => updateDraft("salaryReceiptRef", event.target.value)}
        />
      </ClientField>
    </>
  );
}

function LegalEntityFields({
  draft,
  errors,
  isBusy,
  updateDraft
}: {
  draft: ClientDraft;
  errors: Record<string, string>;
  isBusy: boolean;
  updateDraft: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <TypeField draft={draft} isBusy={isBusy} updateDraft={updateDraft} />
        <StatusField draft={draft} isBusy={isBusy} updateDraft={updateDraft} />
      </div>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <ClientField error={errors.businessName} label="Razon social" required>
          <Input
            autoComplete="organization"
            className={fieldClassName}
            disabled={isBusy}
            value={draft.businessName}
            onChange={(event) => updateDraft("businessName", event.target.value)}
          />
        </ClientField>
        <ClientField error={errors.cuit} label="CUIT">
          <Input
            className={fieldClassName}
            disabled={isBusy}
            inputMode="numeric"
            maxLength={11}
            value={draft.cuit}
            onChange={(event) => updateDraft("cuit", onlyDigits(event.target.value))}
          />
        </ClientField>
      </div>
      <ClientField label="Estatuto" className="md:col-span-2">
        <Textarea
          className={textareaClassName}
          disabled={isBusy}
          value={draft.statute}
          onChange={(event) => updateDraft("statute", event.target.value)}
        />
      </ClientField>
    </>
  );
}

function ClientField({
  children,
  className,
  error,
  label,
  required = false
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

function toDraft(client: ClientDetailDto): ClientDraft {
  return {
    address: client.address ?? "",
    age: client.age === null ? "" : String(client.age),
    businessName: client.businessName ?? "",
    cbu: client.cbu ?? "",
    cuil: client.cuil ?? "",
    cuit: client.cuit ?? "",
    dni: client.dni ?? "",
    email: client.email ?? "",
    firstName: client.firstName ?? "",
    lastName: client.lastName ?? "",
    notes: client.notes ?? "",
    phone: client.phone ?? "",
    salaryReceiptRef: client.salaryReceiptRef ?? "",
    statute: client.statute ?? "",
    status: client.status === "archived" ? "inactive" : client.status,
    type: client.type
  };
}

function toCreatePayload(draft: ClientDraft): ClientsControllerCreateBody {
  const common = getCommonPayload(draft);

  if (draft.type === "human") {
    return {
      ...common,
      age: toNullableNumber(draft.age),
      cuil: toNullableString(draft.cuil),
      dni: toNullableString(draft.dni),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      salaryReceiptRef: toNullableString(draft.salaryReceiptRef),
      type: "human"
    };
  }

  return {
    ...common,
    businessName: draft.businessName.trim(),
    cuit: toNullableString(draft.cuit),
    statute: toNullableString(draft.statute),
    type: "legal_entity"
  };
}

function toUpdatePayload(draft: ClientDraft): ClientsControllerUpdateBody {
  return toCreatePayload(draft) as ClientsControllerUpdateBody;
}

function getCommonPayload(draft: ClientDraft) {
  return {
    address: toNullableString(draft.address),
    cbu: toNullableString(draft.cbu),
    email: toNullableString(draft.email),
    notes: toNullableString(draft.notes),
    phone: toNullableString(draft.phone),
    status: draft.status
  };
}

function validateDraft(draft: ClientDraft) {
  const errors: Record<string, string> = {};

  if (draft.type === "human") {
    if (!draft.firstName.trim()) errors.firstName = "Ingresa el nombre.";
    if (!draft.lastName.trim()) errors.lastName = "Ingresa el apellido.";
    if (draft.dni && !/^\d{7,8}$/.test(draft.dni)) errors.dni = "Debe tener 7 u 8 digitos.";
    if (draft.cuil && !/^\d{11}$/.test(draft.cuil)) errors.cuil = "Debe tener 11 digitos.";
    const age = toNullableNumber(draft.age);
    if (age !== null && (age < 0 || age > 120)) errors.age = "Debe estar entre 0 y 120.";
  } else {
    if (!draft.businessName.trim()) errors.businessName = "Ingresa la razon social.";
    if (draft.cuit && !/^\d{11}$/.test(draft.cuit)) errors.cuit = "Debe tener 11 digitos.";
  }

  if (draft.cbu && !/^\d{22}$/.test(draft.cbu)) errors.cbu = "Debe tener 22 digitos.";

  return errors;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toNullableString(value: string) {
  return value.trim() || null;
}

function toNullableNumber(value: string) {
  return value ? Number(value) : null;
}
