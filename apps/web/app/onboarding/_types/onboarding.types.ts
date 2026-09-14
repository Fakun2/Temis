import type { TemisSession } from "@/lib/auth/session";

export type StepIndex = 0 | 1 | 2;

export type StepErrors = Partial<Record<StepIndex, string>>;

export type OnboardingFormState = {
  owner: {
    fullName: string;
    email: string;
  };
  tenant: {
    name: string;
    legalName?: string;
    taxId: string;
    country: string;
    province: string;
    city: string;
    timezone: string;
    defaultCurrency: string;
    address?: string;
    website?: string;
    logoUrl?: string;
    size?: string;
    mainPracticeAreas: string[];
    referralSource?: string;
  };
  workspace: {
    practiceAreaCodes: string[];
    practiceAreas: string[];
    defaultRoleForInvites: "admin" | "lawyer" | "paralegal" | "accounting" | "viewer";
    caseNumberingMode: "manual" | "automatic";
    documentStorageMode: "local" | "s3";
  };
};

export type PracticeAreaTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
};

export type StartOnboardingResponse = {
  userId: string;
  tenantId: string;
  role: string;
  tokens: TemisSession["tokens"];
};

export type OnboardingResult = {
  tenantId: string;
  userId: string;
};

export type UpdateOwner = <K extends keyof OnboardingFormState["owner"]>(
  key: K,
  value: OnboardingFormState["owner"][K]
) => void;

export type UpdateTenant = <K extends keyof OnboardingFormState["tenant"]>(
  key: K,
  value: OnboardingFormState["tenant"][K]
) => void;

export type UpdateWorkspace = <K extends keyof OnboardingFormState["workspace"]>(
  key: K,
  value: OnboardingFormState["workspace"][K]
) => void;
