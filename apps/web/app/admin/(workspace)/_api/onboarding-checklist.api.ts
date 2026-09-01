import { dashboardHttpClient } from "@/lib/http";
import type {
  OnboardingChecklistResponseDto,
  UpdateOnboardingChecklistStepInput
} from "../_types/onboarding-checklist.types";

export const onboardingChecklistKeys = {
  all: ["onboarding-checklist"] as const,
  detail: () => [...onboardingChecklistKeys.all, "detail"] as const
};

export function getOnboardingChecklist(): Promise<OnboardingChecklistResponseDto> {
  return dashboardHttpClient.request<OnboardingChecklistResponseDto>({
    path: "/onboarding/checklist"
  });
}

export function updateOnboardingChecklistStep({
  stepId,
  status
}: UpdateOnboardingChecklistStepInput): Promise<OnboardingChecklistResponseDto> {
  return dashboardHttpClient.request<OnboardingChecklistResponseDto>({
    body: { status },
    method: "PATCH",
    path: `/onboarding/checklist/${stepId}`
  });
}
