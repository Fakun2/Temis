"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { accountProfileSchema } from "@/lib/validation/account";
import { PasswordChangeSection } from "@/components/dashboard/account/password-change-section";
import {
  AccountCard,
  AccountDialogField,
  InfoGrid,
  SectionError,
  accountInputClassName
} from "@/components/dashboard/account/account-form-ui";
import {
  usePlatformAccount,
  type PlatformAccount,
  type PlatformProfileDraft,
  type PlatformProfileMutation
} from "./_hooks/use-platform-account";

type ProfileDraft = PlatformProfileDraft;

export default function PlatformAccountPage() {
  const { passwordForm, profileMutation, query } = usePlatformAccount();

  if (query.isLoading)
    return <PlatformAccountState message="Cargando tu cuenta de plataforma..." />;
  if (query.error || !query.data) {
    return (
      <PlatformAccountState
        message={query.error?.message ?? "No se pudo cargar tu cuenta de plataforma."}
        retry={query.refetch}
      />
    );
  }

  return (
    <PlatformAccountView
      account={query.data}
      passwordForm={passwordForm}
      profileMutation={profileMutation}
    />
  );
}

function PlatformAccountView({
  account,
  passwordForm,
  profileMutation
}: {
  account: PlatformAccount;
  passwordForm: ReturnType<typeof usePlatformAccount>["passwordForm"];
  profileMutation: PlatformProfileMutation;
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden scrollbar-none pb-5 sm:gap-4 sm:px-3 sm:pb-6 lg:px-8 xl:px-10">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">Cuenta</h1>
        <p className="text-xs text-muted-foreground">
          Perfil y seguridad de tu acceso como superadministrador.
        </p>
      </div>
      <div className="grid min-w-0 gap-3 sm:gap-4">
        <PlatformProfileSection account={account} mutation={profileMutation} />
        <PasswordChangeSection form={passwordForm} hasPassword={account.hasPassword} />
      </div>
    </div>
  );
}

function PlatformProfileSection({
  account,
  mutation
}: {
  account: PlatformAccount;
  mutation: PlatformProfileMutation;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <AccountCard
        id="profile"
        title="Mi perfil"
        icon={UserRound}
        editing={false}
        saving={mutation.isPending}
        onCancel={() => setDialogOpen(false)}
        onEdit={() => setDialogOpen(true)}
      >
        <InfoGrid
          items={[
            ["Nombre", account.firstName],
            ["Apellido", account.lastName],
            ["Email", account.email],
            ["Telefono", account.phone ?? "Sin telefono"]
          ]}
        />
      </AccountCard>
      <PlatformProfileDialog
        account={account}
        mutation={mutation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function PlatformProfileDialog({
  account,
  mutation,
  open,
  onOpenChange
}: {
  account: PlatformAccount;
  mutation: PlatformProfileMutation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toProfileDraft(account));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(toProfileDraft(account));
      setError("");
    }
  }, [account, open]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = accountProfileSchema.safeParse({ ...draft, avatarUrl: undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del perfil.");
      return;
    }

    setError("");
    try {
      await mutation.mutateAsync({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone
      });
      onOpenChange(false);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(560px,calc(100vw-2rem))] gap-0 overflow-y-auto rounded-[1.35rem] border-border/70 bg-card p-0 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.62)]">
        <form className="grid gap-4 p-4 sm:gap-5 sm:p-6" onSubmit={saveProfile}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-foreground">
              Editar perfil
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/35">
            <AccountDialogField label="Nombre">
              <Input
                className={accountInputClassName}
                value={draft.firstName}
                onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
              />
            </AccountDialogField>
            <AccountDialogField label="Apellido">
              <Input
                className={accountInputClassName}
                value={draft.lastName}
                onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
              />
            </AccountDialogField>
            <AccountDialogField label="Telefono">
              <Input
                className={accountInputClassName}
                value={draft.phone ?? ""}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </AccountDialogField>
          </div>
          <SectionError error={error || mutation.error?.message} />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
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

function PlatformAccountState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-4 px-3 lg:px-8">
      <p className="text-sm text-muted-foreground">{message}</p>
      {retry ? (
        <Button variant="outline" onClick={() => retry()}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

function toProfileDraft(account: PlatformAccount): ProfileDraft {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone ?? undefined
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
}
