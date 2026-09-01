"use client";

import { Bell } from "lucide-react";
import type { AccountResponse } from "../_types/account.types";
import { AccountCard, InfoGrid } from "./account-form-ui";

export function NotificationsSection({ account }: { account: AccountResponse }) {
  return (
    <AccountCard
      id="notifications"
      title="Preferencias de notificaciones"
      icon={Bell}
      editing={false}
      saving={false}
      editDisabled
      editDisabledTooltip="Proximamente"
      onCancel={() => undefined}
      onEdit={() => undefined}
    >
      <InfoGrid
        items={[
          ["Recordatorios in-app", account.notifications.inAppReminders ? "Activos" : "Inactivos"],
          [
            "Recordatorios por email",
            account.notifications.emailReminders ? "Activos" : "Inactivos"
          ],
          ["Navegador", account.notifications.browserNotifications ? "Activo" : "Inactivo"],
          ["Resumen diario", account.notifications.dailyDigest ? "Activo" : "Inactivo"],
          ["Anticipacion", `${account.notifications.reminderLeadTime} horas`]
        ]}
      />
    </AccountCard>
  );
}
