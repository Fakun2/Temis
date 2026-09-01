"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getOnboardingChecklist,
  onboardingChecklistKeys,
  updateOnboardingChecklistStep
} from "../_api/onboarding-checklist.api";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import type {
  OnboardingChecklistResponseDto,
  OnboardingChecklistStepId
} from "../_types/onboarding-checklist.types";

export function useOnboardingChecklist() {
  const queryClient = useQueryClient();
  const query = useDashboardQuery({
    queryKey: onboardingChecklistKeys.detail(),
    queryFn: getOnboardingChecklist,
    permission: "admin:access"
  });
  const mutation = useDashboardMutation({
    mutationFn: updateOnboardingChecklistStep,
    onSuccess: (data) => {
      if (query.tenantId) {
        queryClient.setQueryData<OnboardingChecklistResponseDto>(
          [query.tenantId, ...onboardingChecklistKeys.detail()],
          data
        );
      }
    }
  });

  return {
    ...query,
    completeStep: (stepId: OnboardingChecklistStepId) =>
      mutation.mutateAsync({ status: "completed", stepId }),
    isUpdating: mutation.isPending,
    skipStep: (stepId: OnboardingChecklistStepId) =>
      mutation.mutateAsync({ status: "skipped", stepId }),
    updateError: mutation.error
  };
}
