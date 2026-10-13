"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  accountNotificationsSchema,
  type AccountNotificationsFormValues
} from "@/lib/validation/account";
import { useAccountNotificationsMutation } from "../_hooks/use-account-mutations";
import type { AccountResponse } from "../_types/account.types";
import { AccountCard, SectionActions, SectionError } from "./account-form-ui";

const labels = {
  case_task: "Tareas",
  case_expense: "Gastos",
  case_hearing: "Audiencias",
  meeting: "Reuniones"
} as const;

export function NotificationsSection({ account }: { account: AccountResponse }) {
  const mutation = useAccountNotificationsMutation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<AccountNotificationsFormValues>(() => account.notifications);
  useEffect(() => setDraft(account.notifications), [account.notifications]);

  function updatePreference(index: number, field: "inAppEnabled" | "emailEnabled", value: boolean) {
    setDraft((current) => ({
      ...current,
      preferences: current.preferences.map((preference, preferenceIndex) =>
        preferenceIndex === index ? { ...preference, [field]: value } : preference
      )
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const parsed = accountNotificationsSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa las preferencias.");
      return;
    }
    try {
      await mutation.mutateAsync(parsed.data);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar las preferencias.");
    }
  }

  return (
    <AccountCard
      id="notifications"
      title="Preferencias de notificaciones"
      icon={Bell}
      editing={editing}
      saving={mutation.isPending}
      onCancel={() => {
        setDraft(account.notifications);
        setError(undefined);
        setEditing(false);
      }}
      onEdit={() => setEditing(true)}
    >
      <form className="grid gap-4" onSubmit={save}>
        <p className="text-sm text-muted-foreground">
          Elegí qué recordatorios querés recibir dentro de Temis o por email. Los cambios se aplican
          a los próximos envíos.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/50">
          <div className="grid grid-cols-[1fr_86px_86px] gap-2 border-b border-border/50 bg-secondary/30 px-3 py-2 text-xs font-medium text-muted-foreground sm:px-4">
            <span>Recordatorio</span>
            <span className="text-center">In-app</span>
            <span className="text-center">Email</span>
          </div>
          {draft.preferences.map((preference, index) => (
            <div
              key={preference.resourceType}
              className="grid grid-cols-[1fr_86px_86px] items-center gap-2 border-b border-border/40 px-3 py-3 last:border-b-0 sm:px-4"
            >
              <span className="text-sm font-medium">{labels[preference.resourceType]}</span>
              <div className="flex justify-center">
                <Checkbox
                  disabled={!editing}
                  checked={preference.inAppEnabled}
                  onCheckedChange={(value) =>
                    updatePreference(index, "inAppEnabled", value === true)
                  }
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  disabled={!editing}
                  checked={preference.emailEnabled}
                  onCheckedChange={(value) =>
                    updatePreference(index, "emailEnabled", value === true)
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <SectionError error={error} />
        {editing ? <SectionActions saving={mutation.isPending} /> : null}
      </form>
    </AccountCard>
  );
}
