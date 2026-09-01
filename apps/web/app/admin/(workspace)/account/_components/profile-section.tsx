"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode
} from "react";
import { Camera, Crown, MapPin, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { accountProfileSchema, type AccountProfileFormValues } from "@/lib/validation/account";
import {
  useAccountAvatarMutation,
  useAccountProfileMutation
} from "../_hooks/use-account-mutations";
import type { AccountResponse } from "../_types/account.types";
import { getInitials } from "../_utils/account-format";
import { toProfileDraft } from "../_utils/account-drafts";
import { AccountCard, InfoGrid, accountInputClassName } from "./account-form-ui";

const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/svg+xml", "image/webp"]);
const avatarMaxSizeBytes = 5 * 1024 * 1024;
const avatarMaxDimensionPx = 2048;
const avatarPreviewSizePx = 96;

export function ProfileSection({ account }: { account: AccountResponse }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const profileMutation = useAccountProfileMutation();
  const avatarMutation = useAccountAvatarMutation();
  const saving = profileMutation.isPending || avatarMutation.isPending;

  return (
    <>
      <AccountCard
        id="profile"
        title="Mi perfil"
        icon={UserRound}
        editing={false}
        saving={saving}
        onCancel={() => setDialogOpen(false)}
        onEdit={() => setDialogOpen(true)}
      >
        <div className="grid gap-5">
          <ProfileSummary account={account} />

          <InfoGrid
            items={[
              ["Nombre", account.profile.firstName],
              ["Apellido", account.profile.lastName],
              ["Email", account.profile.email],
              ["Telefono", account.profile.phone ?? "Sin telefono"]
            ]}
          />
        </div>
      </AccountCard>

      <ProfileEditDialog
        account={account}
        avatarMutation={avatarMutation}
        open={dialogOpen}
        profileMutation={profileMutation}
        saving={saving}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function ProfileEditDialog({
  account,
  avatarMutation,
  open,
  profileMutation,
  saving,
  onOpenChange
}: {
  account: AccountResponse;
  avatarMutation: ReturnType<typeof useAccountAvatarMutation>;
  open: boolean;
  profileMutation: ReturnType<typeof useAccountProfileMutation>;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<AccountProfileFormValues>(() => toProfileDraft(account));
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(toProfileDraft(account));
    setSelectedAvatar(null);
    setAvatarPreviewUrl(null);
    setError(undefined);
  }, [account, open]);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    },
    [avatarPreviewUrl]
  );

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const parsed = accountProfileSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del perfil.");
      return;
    }

    try {
      let avatarUrl = parsed.data.avatarUrl;

      if (selectedAvatar) {
        const avatar = await avatarMutation.mutateAsync(selectedAvatar);
        avatarUrl = avatar.avatarUrl;
      }

      await profileMutation.mutateAsync({
        ...parsed.data,
        avatarUrl
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el perfil.");
    }
  }

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = await validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedAvatar(null);
      setAvatarPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
      return;
    }

    setError(undefined);
    setSelectedAvatar(file);
    setAvatarPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });
  }

  const avatarSrc = avatarPreviewUrl ?? account.profile.avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(560px,calc(100vw-2rem))] gap-0 overflow-y-auto rounded-[1.35rem] border-border/70 bg-card p-0 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.62)]">
        <form className="grid gap-4 p-4 sm:gap-5 sm:p-6" onSubmit={saveProfile}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-foreground">
              Editar perfil
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-center">
            <button
              type="button"
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar avatar"
            >
              <Avatar
                className="bg-[#9959c6] text-white shadow-sm"
                style={{ height: avatarPreviewSizePx, width: avatarPreviewSizePx }}
              >
                {avatarSrc ? <AvatarImage src={avatarSrc} alt={account.profile.fullName} /> : null}
                <AvatarFallback className="bg-[#9959c6] text-3xl font-normal text-white sm:text-5xl">
                  {getInitials(account.profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-[#b792cf] text-white shadow-[0_10px_24px_-16px_rgba(60,20,90,0.85)] ring-4 ring-card transition-transform group-hover:scale-105">
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
              onChange={selectAvatar}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/35">
            <ProfileDialogField label="Nombre">
              <Input
                className={accountInputClassName}
                value={draft.firstName}
                onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
              />
            </ProfileDialogField>
            <ProfileDialogField label="Apellido">
              <Input
                className={accountInputClassName}
                value={draft.lastName}
                onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
              />
            </ProfileDialogField>
            <ProfileDialogField label="Telefono">
              <Input
                className={accountInputClassName}
                value={draft.phone ?? ""}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </ProfileDialogField>
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
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl px-6" disabled={saving}>
              {saving ? "Guardando" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialogField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2.5 border-b border-border/50 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_240px] sm:items-center">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}

async function validateAvatarFile(file: File) {
  if (!avatarMimeTypes.has(file.type)) {
    return "El avatar debe ser una imagen JPG, PNG, WebP o SVG.";
  }

  if (file.size > avatarMaxSizeBytes) {
    return "El avatar no puede superar 5 MB.";
  }

  const dimensions = await readImageDimensions(file).catch(() => null);
  if (
    dimensions &&
    (dimensions.width > avatarMaxDimensionPx || dimensions.height > avatarMaxDimensionPx)
  ) {
    return `El avatar no puede superar ${avatarMaxDimensionPx} x ${avatarMaxDimensionPx} px.`;
  }

  return null;
}

function readImageDimensions(file: File) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer el tamaño de la imagen."));
    };
    image.src = objectUrl;
  });
}

function ProfileSummary({ account }: { account: AccountResponse }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <ProfileRoleAvatar account={account} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {account.profile.fullName}
          </p>
          <p className="text-sm text-muted-foreground">
            {account.membership.roleName ?? "Miembro del estudio"}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {[account.studio.city, account.studio.province, account.studio.country]
              .filter(Boolean)
              .join(", ") || "Sin ubicacion"}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="h-7 capitalize">
        {account.membership.status}
      </Badge>
    </div>
  );
}

function ProfileRoleAvatar({ account }: { account: AccountResponse }) {
  const owner = isOwnerRole(account.membership);

  return (
    <div
      className="relative grid w-20 shrink-0 place-items-center"
      aria-label={`Avatar de ${account.profile.fullName}`}
    >
      {owner ? (
        <span className="absolute left-1/2 bottom-8 z-10 grid size-9 -translate-x-[54%] rotate-[-13deg] origin-bottom place-items-center text-yellow-500 drop-shadow-[0_3px_3px_rgba(120,80,0,0.22)]">
          <Crown
            className="h-8 w-8 fill-yellow-300 stroke-yellow-600"
            strokeWidth={1.65}
            aria-hidden="true"
          />
        </span>
      ) : null}

      <Avatar className="relative z-10 size-16 shadow-sm ring-4 ring-background" size="lg">
        {account.profile.avatarUrl ? (
          <AvatarImage src={account.profile.avatarUrl} alt={account.profile.fullName} />
        ) : null}
        <AvatarFallback className="bg-btn-secondary text-base font-semibold">
          {getInitials(account.profile.fullName)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function isOwnerRole(membership: AccountResponse["membership"]) {
  const role = `${membership.roleCode ?? ""} ${membership.roleName ?? ""}`.toLowerCase();

  return role.includes("owner");
}
