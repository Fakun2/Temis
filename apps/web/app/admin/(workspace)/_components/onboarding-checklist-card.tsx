"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  SkipForward,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAccountNotificationsMutation } from "../account/_hooks/use-account-mutations";
import { useAccountQuery } from "../account/_hooks/use-account-query";
import { useCourtImportDialog } from "../account/_hooks/use-court-import-dialog";
import {
  courtImportSystems,
  type CourtImportSystem
} from "../account/_constants/court-import-systems";
import { CourtImportDialog } from "../account/_components/expedientes/court-import-dialog";
import { CourtSystemPill } from "../account/_components/expedientes/court-system-pill";
import { createCashboxMovement } from "../cashbox/_api/cashbox.api";
import { createCategory, listCategories } from "../categories/_api/categories.api";
import { addTenantCurrencies } from "../currencies/_api/currencies.api";
import {
  onboardingChecklistDefaultCategories,
  onboardingChecklistDoneLabel,
  onboardingChecklistCurrencyOptions,
  onboardingChecklistIcons
} from "../_constants/onboarding-checklist";
import { useOnboardingChecklist } from "../_hooks/use-onboarding-checklist";
import type {
  OnboardingChecklistStepDto,
  OnboardingChecklistStepId
} from "../_types/onboarding-checklist.types";
import type { AccountNotificationsFormValues } from "@/lib/validation/account";
import { getErrorMessage } from "../account/_utils/account-format";

type ActiveStep = OnboardingChecklistStepDto | null;

export function OnboardingChecklistCard() {
  const checklist = useOnboardingChecklist();
  const [activeStep, setActiveStep] = useState<ActiveStep>(null);
  const pendingSteps = checklist.data?.steps.filter((step) => step.status === "pending") ?? [];

  if (!checklist.hasPermission || checklist.data?.hidden) {
    return null;
  }

  if (checklist.isLoading && !checklist.data) {
    return (
      <Card
        data-admin-surface
        className="rounded-xl border-0 bg-card shadow-[var(--admin-card-shadow)]"
      >
        <CardContent className="flex min-h-28 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Preparando primeros pasos...
        </CardContent>
      </Card>
    );
  }

  if (!checklist.data || pendingSteps.length === 0) {
    return null;
  }

  async function skipStep(stepId: OnboardingChecklistStepId) {
    await checklist.skipStep(stepId);
    setActiveStep(null);
  }

  async function completeStep(stepId: OnboardingChecklistStepId) {
    await checklist.completeStep(stepId);
    setActiveStep(null);
  }

  return (
    <>
      <Card
        data-admin-surface
        className="overflow-hidden rounded-xl border-0 bg-card shadow-[var(--admin-card-shadow)]"
      >
        <CardHeader className="gap-4 pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-btn-secondary text-foreground">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-xl text-foreground">Configura tu estudio</CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Completa lo esencial para dejar el workspace listo. Cada paso se puede omitir.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">
              {checklist.data.completedCount}/{checklist.data.totalCount}
            </Badge>
          </div>
          <Progress value={checklist.data.progress} className="h-2" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {checklist.data.steps.map((step) => (
            <ChecklistStepRow
              key={step.id}
              busy={checklist.isUpdating}
              step={step}
              onOpen={() => setActiveStep(step)}
              onSkip={() => skipStep(step.id)}
            />
          ))}
          {checklist.updateError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {checklist.updateError.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(activeStep)} onOpenChange={(open) => !open && setActiveStep(null)}>
        <DialogContent className="max-h-[88svh] max-w-3xl overflow-hidden p-0">
          <div className="grid max-h-[88svh] grid-rows-[auto_minmax(0,1fr)]">
            <DialogHeader className="border-b border-border/50 px-5 py-4 pr-12">
              <DialogTitle>{activeStep?.title}</DialogTitle>
              <DialogDescription>{activeStep?.description}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto px-5 py-4">
              {activeStep ? (
                <OnboardingStepPanel
                  step={activeStep}
                  onComplete={() => completeStep(activeStep.id)}
                  onSkip={() => skipStep(activeStep.id)}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChecklistStepRow({
  busy,
  onOpen,
  onSkip,
  step
}: {
  busy: boolean;
  onOpen: () => void;
  onSkip: () => void;
  step: OnboardingChecklistStepDto;
}) {
  const Icon = onboardingChecklistIcons[step.id];
  const done = step.status !== "pending";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-btn-secondary text-foreground">
          {done ? (
            <CheckCircle2 className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
          ) : (
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
            {done ? (
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                {step.status === "completed"
                  ? onboardingChecklistDoneLabel.completed
                  : onboardingChecklistDoneLabel.skipped}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
        </div>
      </div>
      {!done ? (
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={onSkip} disabled={busy}>
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Omitir
          </Button>
          <Button type="button" size="sm" onClick={onOpen} disabled={busy}>
            {step.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function OnboardingStepPanel({
  onComplete,
  onSkip,
  step
}: {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
  step: OnboardingChecklistStepDto;
}) {
  if (step.id === "import_cases") {
    return <ImportCasesSetup onComplete={onComplete} onSkip={onSkip} />;
  }

  if (step.id === "configure_finance") {
    return <FinanceSetup onComplete={onComplete} onSkip={onSkip} />;
  }

  if (step.id === "configure_notifications") {
    return <NotificationsSetup onComplete={onComplete} onSkip={onSkip} />;
  }

  return <CalendarSetup onComplete={onComplete} onSkip={onSkip} />;
}

function ImportCasesSetup({
  onComplete,
  onSkip
}: {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const importDialog = useCourtImportDialog({
    onImported: () => {
      void onComplete();
    }
  });
  const handleSelectSystem = useCallback(
    (system: CourtImportSystem) => {
      importDialog.openSystem(system);
    },
    [importDialog.openSystem]
  );

  return (
    <div className="grid gap-4">
      <p className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
        Las credenciales se piden en cada busqueda y no se guardan en BogApp.
      </p>
      <div className="flex flex-wrap gap-2">
        {courtImportSystems.map((system) => (
          <CourtSystemPill
            key={system.id}
            disabled={false}
            system={system}
            onSelect={handleSelectSystem}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => void onSkip()}>
          Omitir por ahora
        </Button>
      </div>
      {importDialog.selectedSystem ? <CourtImportDialog state={importDialog} /> : null}
    </div>
  );
}

function FinanceSetup({
  onComplete,
  onSkip
}: {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [currencyCodes, setCurrencyCodes] = useState(["ARS"]);
  const [categoryNames, setCategoryNames] = useState<string[]>(
    onboardingChecklistDefaultCategories.map((category) => category.name)
  );
  const [initialBalance, setInitialBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveFinanceSetup() {
    if (currencyCodes.length === 0) {
      setError("Selecciona al menos una moneda.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addTenantCurrencies({ currencyCodes });
      const existingCategories = await listCategories({
        kind: "all",
        limit: 50,
        origin: "tenant",
        sort: "name:asc",
        status: "active"
      });
      const existingNames = new Set(
        existingCategories.items.map((category) => category.name.trim().toLowerCase())
      );

      await Promise.all(
        onboardingChecklistDefaultCategories.map((category, index) => {
          const name = categoryNames[index]?.trim();

          if (!name || existingNames.has(name.toLowerCase())) {
            return Promise.resolve();
          }

          return createCategory({
            active: true,
            kind: category.kind,
            name
          });
        })
      );

      if (initialBalance.trim()) {
        await createCashboxMovement({
          amount: initialBalance,
          currencyCode: currencyCodes[0] ?? "ARS",
          description: "Saldo inicial",
          type: "income"
        });
      }

      await onComplete();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <Label>Monedas activas</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {onboardingChecklistCurrencyOptions.map((currency) => (
            <label
              key={currency.code}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm"
            >
              <Checkbox
                checked={currencyCodes.includes(currency.code)}
                onCheckedChange={(checked) => {
                  setCurrencyCodes((current) =>
                    checked
                      ? [...new Set([...current, currency.code])]
                      : current.length === 1
                        ? current
                        : current.filter((code) => code !== currency.code)
                  );
                }}
              />
              <span>
                <span className="font-medium">{currency.code}</span>
                <span className="ml-2 text-xs text-muted-foreground">{currency.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <Label>Categorias iniciales</Label>
        <div className="grid gap-2 md:grid-cols-3">
          {onboardingChecklistDefaultCategories.map((category, index) => (
            <Input
              key={category.name}
              value={categoryNames[index] ?? ""}
              onChange={(event) => {
                const next = [...categoryNames];
                next[index] = event.target.value;
                setCategoryNames(next);
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="initial-balance">Saldo inicial opcional</Label>
        <Input
          id="initial-balance"
          inputMode="decimal"
          placeholder="Ej: 150.000,00"
          value={initialBalance}
          onChange={(event) => setInitialBalance(event.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogActions
        saving={saving}
        onSkip={onSkip}
        onSave={saveFinanceSetup}
        saveLabel="Guardar caja"
      />
    </div>
  );
}

function NotificationsSetup({
  onComplete,
  onSkip
}: {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const account = useAccountQuery();
  const mutation = useAccountNotificationsMutation();
  const initial = account.data?.notifications;
  const [draft, setDraft] = useState<AccountNotificationsFormValues>({
    browserNotifications: false,
    dailyDigest: false,
    emailReminders: false,
    inAppReminders: true,
    reminderLeadTime: 24
  });
  const [hydrated, setHydrated] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission
  );

  useEffect(() => {
    if (!initial || hydrated) {
      return;
    }

    setDraft({
      browserNotifications: initial.browserNotifications,
      dailyDigest: initial.dailyDigest,
      emailReminders: initial.emailReminders,
      inAppReminders: initial.inAppReminders,
      reminderLeadTime: initial.reminderLeadTime
    });
    setHydrated(true);
  }, [hydrated, initial]);

  async function toggleBrowserNotifications(checked: boolean) {
    if (!checked) {
      setDraft((current) => ({ ...current, browserNotifications: false }));
      return;
    }

    if (!("Notification" in window)) {
      setBrowserPermission("unsupported");
      setDraft((current) => ({ ...current, browserNotifications: false }));
      return;
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setBrowserPermission(permission);
    setDraft((current) => ({ ...current, browserNotifications: permission === "granted" }));
  }

  async function saveNotifications() {
    await mutation.mutateAsync(draft);
    await onComplete();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleRow
          checked={draft.inAppReminders}
          label="Recordatorios in-app"
          onCheckedChange={(checked) =>
            setDraft((current) => ({ ...current, inAppReminders: checked }))
          }
        />
        <ToggleRow
          checked={draft.emailReminders}
          label="Recordatorios por email"
          onCheckedChange={(checked) =>
            setDraft((current) => ({ ...current, emailReminders: checked }))
          }
        />
        <ToggleRow
          checked={draft.browserNotifications}
          label="Notificaciones del navegador"
          onCheckedChange={(checked) => void toggleBrowserNotifications(checked)}
        />
        <ToggleRow
          checked={draft.dailyDigest}
          label="Resumen diario"
          onCheckedChange={(checked) =>
            setDraft((current) => ({ ...current, dailyDigest: checked }))
          }
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reminder-lead-time">Anticipacion predeterminada en horas</Label>
        <Input
          id="reminder-lead-time"
          inputMode="numeric"
          value={draft.reminderLeadTime}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              reminderLeadTime: Number(event.target.value)
            }))
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Estado del navegador:{" "}
        {browserPermission === "unsupported" ? "no compatible" : browserPermission}.
      </p>

      {mutation.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mutation.error.message}
        </p>
      ) : null}

      <DialogActions
        saving={mutation.isPending}
        onSkip={onSkip}
        onSave={saveNotifications}
        saveLabel="Guardar notificaciones"
      />
    </div>
  );
}

function CalendarSetup({
  onComplete,
  onSkip
}: {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Calendar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              La conexion OAuth queda preparada para una siguiente iteracion.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            Proximamente
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => void onSkip()}>
          Omitir
        </Button>
        <Button type="button" onClick={() => void onComplete()}>
          Registrar interes
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <span className="font-medium text-foreground">{label}</span>
    </label>
  );
}

function DialogActions({
  onSave,
  onSkip,
  saveLabel,
  saving
}: {
  onSave: () => Promise<void>;
  onSkip: () => Promise<void>;
  saveLabel: string;
  saving: boolean;
}) {
  return (
    <>
      <Separator />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => void onSkip()} disabled={saving}>
          Omitir
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {saveLabel}
        </Button>
      </div>
    </>
  );
}
