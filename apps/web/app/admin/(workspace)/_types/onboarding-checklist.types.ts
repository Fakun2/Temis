export type OnboardingChecklistStepId =
  | "import_cases"
  | "configure_finance"
  | "configure_notifications"
  | "connect_calendar";

export type OnboardingChecklistStepStatus = "pending" | "completed" | "skipped";

export type OnboardingChecklistStepDto = {
  actionLabel: string;
  description: string;
  enabled: boolean;
  id: OnboardingChecklistStepId;
  requiredPermission?: string | null;
  status: OnboardingChecklistStepStatus;
  title: string;
};

export type OnboardingChecklistResponseDto = {
  completedCount: number;
  hidden: boolean;
  progress: number;
  steps: OnboardingChecklistStepDto[];
  totalCount: number;
};

export type UpdateOnboardingChecklistStepInput = {
  status: Exclude<OnboardingChecklistStepStatus, "pending">;
  stepId: OnboardingChecklistStepId;
};
