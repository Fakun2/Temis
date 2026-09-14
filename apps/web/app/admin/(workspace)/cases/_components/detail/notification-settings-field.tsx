"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { NotificationOptions, NotificationRecipientMode } from "../../_types/cases.types";
import {
  caseNativeDateTimeInputClassName,
  caseSelectTriggerClassName
} from "../../_constants/cases.constants";
import { CaseDateInput } from "../sheet/case-date-input";
import { CaseField } from "../sheet/case-field";
import { ParticipantSelectorDialog } from "./participant-selector-dialog";

type NotificationDraft = {
  notificationDate?: string | null;
  notificationEnabled: boolean;
  notificationMembershipIds: string[];
  notificationPracticeAreaId?: string | null;
  notificationRecipientMode: NotificationRecipientMode;
  notificationTime?: string | null;
};

type NotificationErrors = Partial<Record<keyof NotificationDraft, string>>;

type NotificationSettingsFieldProps<TDraft extends NotificationDraft> = {
  defaultPracticeAreaId?: string | null;
  draft: TDraft;
  errors: NotificationErrors;
  options?: NotificationOptions;
  updateDraft: <K extends keyof TDraft>(key: K, value: TDraft[K]) => void;
};

const recipientModeLabels: Record<NotificationRecipientMode, string> = {
  members: "Personas especificas",
  practice_area: "Area de trabajo",
  self: "Solo yo",
  tenant: "Todo el equipo"
};

export function NotificationSettingsField<TDraft extends NotificationDraft>({
  defaultPracticeAreaId,
  draft,
  errors,
  options,
  updateDraft
}: NotificationSettingsFieldProps<TDraft>) {
  const practiceAreas = options?.practiceAreas ?? [];
  const today = getBuenosAiresTodayDateString();
  const notificationsDisabled = !draft.notificationEnabled;

  function updateEnabled(enabled: boolean) {
    updateDraft("notificationEnabled", enabled as TDraft["notificationEnabled"]);
    if (!enabled) {
      updateDraft("notificationDate", "" as TDraft["notificationDate"]);
      updateDraft("notificationTime", "" as TDraft["notificationTime"]);
      updateDraft("notificationMembershipIds", [] as TDraft["notificationMembershipIds"]);
      updateDraft("notificationPracticeAreaId", "" as TDraft["notificationPracticeAreaId"]);
      updateDraft("notificationRecipientMode", "self" as TDraft["notificationRecipientMode"]);
    } else if (defaultPracticeAreaId && !draft.notificationPracticeAreaId) {
      updateDraft(
        "notificationPracticeAreaId",
        defaultPracticeAreaId as TDraft["notificationPracticeAreaId"]
      );
    }
  }

  function updateRecipientMode(mode: NotificationRecipientMode) {
    updateDraft("notificationRecipientMode", mode as TDraft["notificationRecipientMode"]);
    if (mode !== "members") {
      updateDraft("notificationMembershipIds", [] as TDraft["notificationMembershipIds"]);
    }
    if (mode !== "practice_area") {
      updateDraft("notificationPracticeAreaId", "" as TDraft["notificationPracticeAreaId"]);
    } else if (defaultPracticeAreaId && !draft.notificationPracticeAreaId) {
      updateDraft(
        "notificationPracticeAreaId",
        defaultPracticeAreaId as TDraft["notificationPracticeAreaId"]
      );
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-background/35 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={draft.notificationEnabled}
          className="mt-0.5"
          onCheckedChange={(checked) => updateEnabled(checked === true)}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Notificacion</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Programa un recordatorio interno y elige quien lo recibe.
          </p>
        </div>
      </div>

      <div
        aria-hidden={notificationsDisabled}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          draft.notificationEnabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <CaseField error={errors.notificationDate} label="Fecha de notificacion" required>
              <CaseDateInput
                autoComplete="off"
                disabled={notificationsDisabled}
                min={today}
                value={draft.notificationDate ?? ""}
                onChange={(event) =>
                  updateDraft("notificationDate", event.target.value as TDraft["notificationDate"])
                }
              />
            </CaseField>
            <CaseField error={errors.notificationTime} label="Hora de notificacion" required>
              <Input
                autoComplete="off"
                className={caseNativeDateTimeInputClassName}
                disabled={notificationsDisabled}
                type="time"
                value={draft.notificationTime ?? ""}
                onChange={(event) =>
                  updateDraft("notificationTime", event.target.value as TDraft["notificationTime"])
                }
              />
            </CaseField>
          </div>

          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <CaseField label="Destinatarios" required>
              <Select
                disabled={notificationsDisabled}
                value={draft.notificationRecipientMode}
                onValueChange={updateRecipientMode}
              >
                <SelectTrigger className={caseSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(recipientModeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CaseField>

            {draft.notificationRecipientMode === "practice_area" ? (
              <CaseField error={errors.notificationPracticeAreaId} label="Area de trabajo" required>
                <Select
                  disabled={notificationsDisabled}
                  value={draft.notificationPracticeAreaId ?? ""}
                  onValueChange={(value) =>
                    updateDraft(
                      "notificationPracticeAreaId",
                      value as TDraft["notificationPracticeAreaId"]
                    )
                  }
                >
                  <SelectTrigger className={caseSelectTriggerClassName}>
                    <SelectValue placeholder="Selecciona un area" />
                  </SelectTrigger>
                  <SelectContent>
                    {practiceAreas.map((practiceArea) => (
                      <SelectItem key={practiceArea.id} value={practiceArea.id}>
                        {practiceArea.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CaseField>
            ) : null}
          </div>

          {draft.notificationRecipientMode === "members" ? (
            <CaseField className="mt-4" error={errors.notificationMembershipIds} label="Personas" required>
              <ParticipantSelectorDialog
                disabled={notificationsDisabled}
                emptyLabel="Seleccionar destinatarios"
                onApply={(membershipIds) =>
                  updateDraft(
                    "notificationMembershipIds",
                    membershipIds as TDraft["notificationMembershipIds"]
                  )
                }
                selectedMembershipIds={draft.notificationMembershipIds}
                title="Seleccionar destinatarios"
              />
            </CaseField>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getBuenosAiresTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}
