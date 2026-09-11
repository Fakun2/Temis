"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  hasTenantAccess,
  saveSession,
  type TemisSession
} from "@/lib/auth/session";
import {
  initialOnboardingState,
  onboardingLoadingExitMs,
  onboardingLoadingSuccessMs,
  onboardingLoadingTotalMs,
  onboardingSteps
} from "../_constants/onboarding.constants";
import {
  onboardingFormSchema,
  onboardingOwnerSchema,
  onboardingTenantSchema,
  onboardingWorkspaceSchema,
  type OnboardingFormInput,
  type OnboardingPayload
} from "../_schemas/onboarding.schema";
import type {
  OnboardingFormState,
  OnboardingResult,
  PracticeAreaTemplate,
  StartOnboardingResponse,
  StepErrors,
  StepIndex
} from "../_types/onboarding.types";
import { getStepFromIssue, makeStudyName } from "../_utils/onboarding-format";
import { useOnboardingTransition } from "./use-onboarding-transition";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useOnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [form, setForm] = useState<OnboardingFormState>(initialOnboardingState);
  const [session, setSession] = useState<TemisSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [practiceAreasEnabled, setPracticeAreasEnabled] = useState(false);
  const [practiceAreaTemplates, setPracticeAreaTemplates] = useState<PracticeAreaTemplate[]>([]);
  const [practiceAreaTemplatesError, setPracticeAreaTemplatesError] = useState<string | null>(null);
  const [practiceAreaTemplatesLoading, setPracticeAreaTemplatesLoading] = useState(false);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const transition = useOnboardingTransition();

  const currentStep = onboardingSteps[step] ?? onboardingSteps[0];
  const progress = useMemo(() => ((step + 1) / onboardingSteps.length) * 100, [step]);

  useEffect(() => {
    void loadInitialSession();
  }, [router]);

  async function loadInitialSession() {
    const storedSession = await fetchClientSession();

    if (!storedSession) {
      clearSession();
      setSessionReady(true);
      router.replace("/login");
      return;
    }

    if (hasTenantAccess(storedSession)) {
      router.replace("/admin");
      return;
    }

    const defaultStudyName = makeStudyName(storedSession.user.fullName);
    setSession(storedSession);
    void loadPracticeAreaTemplates();
    setForm((current) => ({
      ...current,
      owner: {
        fullName: storedSession.user.fullName,
        email: storedSession.user.email
      },
      tenant: {
        ...current.tenant,
        name: current.tenant.name || defaultStudyName
      }
    }));
    setSessionReady(true);
  }

  function clearStepError(stepIndex: StepIndex) {
    setStepErrors((current) => ({ ...current, [stepIndex]: undefined }));
  }

  function setStepError(stepIndex: StepIndex, message: string) {
    setStepErrors((current) => ({ ...current, [stepIndex]: message }));
  }

  function updateOwner<K extends keyof OnboardingFormState["owner"]>(
    key: K,
    value: OnboardingFormState["owner"][K]
  ) {
    setForm((current) => ({ ...current, owner: { ...current.owner, [key]: value } }));
    clearStepError(0);
  }

  function updateTenant<K extends keyof OnboardingFormState["tenant"]>(
    key: K,
    value: OnboardingFormState["tenant"][K]
  ) {
    setForm((current) => ({ ...current, tenant: { ...current.tenant, [key]: value } }));
    clearStepError(1);
  }

  function updateWorkspace<K extends keyof OnboardingFormState["workspace"]>(
    key: K,
    value: OnboardingFormState["workspace"][K]
  ) {
    setForm((current) => ({ ...current, workspace: { ...current.workspace, [key]: value } }));
    clearStepError(2);
  }

  function togglePracticeArea(code: string) {
    setForm((current) => {
      const selected = current.workspace.practiceAreaCodes.includes(code);
      const practiceAreaCodes = selected
        ? current.workspace.practiceAreaCodes.filter((item) => item !== code)
        : [...current.workspace.practiceAreaCodes, code];

      return {
        ...current,
        workspace: {
          ...current.workspace,
          practiceAreaCodes
        }
      };
    });
    clearStepError(2);
  }

  function setPracticeAreasEnabledValue(enabled: boolean) {
    setPracticeAreasEnabled(enabled);
    if (
      enabled &&
      session &&
      !practiceAreaTemplatesLoading &&
      practiceAreaTemplates.length === 0
    ) {
      void loadPracticeAreaTemplates();
    }
    clearStepError(2);
  }

  function buildPayload(): OnboardingFormInput {
    return {
      owner: {
        fullName: form.owner.fullName,
        email: form.owner.email
      },
      tenant: {
        ...form.tenant
      },
      workspace: {
        ...form.workspace,
        practiceAreaCodes: practiceAreasEnabled ? form.workspace.practiceAreaCodes : [],
        practiceAreas: []
      }
    };
  }

  function validateStep(stepIndex: StepIndex) {
    const payload = buildPayload();
    const schemaByStep = [
      onboardingOwnerSchema,
      onboardingTenantSchema,
      onboardingWorkspaceSchema
    ] as const;
    const dataByStep = [payload.owner, payload.tenant, payload.workspace] as const;
    const parsed = schemaByStep[stepIndex].safeParse(dataByStep[stepIndex]);

    if (!parsed.success) {
      setStepError(stepIndex, parsed.error.issues[0]?.message ?? "Revisa los datos de este paso.");
      return false;
    }

    clearStepError(stepIndex);
    return true;
  }

  function goToStep(nextStep: StepIndex) {
    if (nextStep === step || submitting) {
      return;
    }

    setStep(nextStep);
  }

  function goNext() {
    if (!validateStep(step)) {
      return;
    }

    goToStep(Math.min(step + 1, onboardingSteps.length - 1) as StepIndex);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearStepError(step);

    if (step < onboardingSteps.length - 1) {
      goNext();
    }
  }

  async function completeOnboarding() {
    clearStepError(step);

    if (!session) {
      router.replace("/login");
      return;
    }

    const parsed = onboardingFormSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const errorStep = getStepFromIssue(parsed.error.issues[0]) ?? step;
      goToStep(errorStep);
      setStepError(errorStep, parsed.error.issues[0]?.message ?? "Revisa los datos de este paso.");
      return;
    }

    setSubmitting(true);
    transition.start();
    let shouldHideTransition = true;
    const transitionStartedAt = Date.now();

    try {
      const response = await requestStartOnboarding(parsed.data);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "No se pudo completar el onboarding.");
      }

      const body = (await response.json()) as StartOnboardingResponse;
      const refreshedSession = await fetchClientSession();
      if (refreshedSession) {
        saveSession({
          ...refreshedSession,
          user: {
            ...refreshedSession.user,
            fullName: parsed.data.owner.fullName,
            email: parsed.data.owner.email
          }
        });
      }
      setResult({ tenantId: body.tenantId, userId: body.userId });
      const elapsed = Date.now() - transitionStartedAt;
      await wait(Math.max(onboardingLoadingTotalMs - elapsed, 0));
      transition.showSuccess();
      await wait(onboardingLoadingSuccessMs);
      transition.exit();
      await wait(onboardingLoadingExitMs);
      shouldHideTransition = false;
      router.push("/admin");
    } catch (caught) {
      setStepError(
        2,
        caught instanceof Error ? caught.message : "No se pudo completar el onboarding."
      );
    } finally {
      if (shouldHideTransition) {
        transition.reset();
        setSubmitting(false);
      }
    }
  }

  return {
    currentStep,
    form,
    completeOnboarding,
    goNext,
    goToStep,
    practiceAreasEnabled,
    practiceAreaTemplates,
    practiceAreaTemplatesError,
    practiceAreaTemplatesLoading,
    progress,
    result,
    sessionReady,
    setPracticeAreasEnabled: setPracticeAreasEnabledValue,
    step,
    stepError: stepErrors[step],
    submit,
    submitting,
    transitionExiting: transition.exiting,
    transitionSuccess: transition.success,
    togglePracticeArea,
    updateOwner,
    updateWorkspace,
    updateTenant
  };

  async function loadPracticeAreaTemplates() {
    setPracticeAreaTemplatesLoading(true);
    setPracticeAreaTemplatesError(null);

    try {
      const response = await requestPracticeAreaTemplates();

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const templates = (await response.json()) as PracticeAreaTemplate[];
      setPracticeAreaTemplates(templates);
    } catch (caught) {
      setPracticeAreaTemplatesError(
        caught instanceof Error ? caught.message : "No se pudieron cargar las areas reutilizables."
      );
    } finally {
      setPracticeAreaTemplatesLoading(false);
    }
  }

  async function requestPracticeAreaTemplates() {
    const response = await fetchPracticeAreaTemplates();

    if (response.status === 401) {
      clearSession();
      router.replace("/login");
    }

    return response;
  }

  async function fetchPracticeAreaTemplates() {
    return fetch("/api/practice-area-templates");
  }

  async function getResponseErrorMessage(response: Response) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = body?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    return `No se pudieron cargar las areas reutilizables. (${response.status})`;
  }

  async function requestStartOnboarding(payload: OnboardingPayload) {
    return startOnboardingRequest(payload);
  }

  async function startOnboardingRequest(payload: OnboardingPayload) {
    return fetch("/api/onboarding/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async function fetchClientSession() {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TemisSession;
  }
}
