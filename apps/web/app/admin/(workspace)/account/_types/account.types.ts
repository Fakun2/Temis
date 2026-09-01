export type AccountResponse = {
  profile: {
    avatarUrl: string | null;
    email: string;
    firstName: string;
    fullName: string;
    hasPassword: boolean;
    id: string;
    lastName: string;
    phone: string | null;
  };
  studio: {
    address: string | null;
    city: string;
    country: string;
    id: string;
    legalName: string | null;
    logoUrl: string | null;
    name: string;
    province: string;
    taxId: string | null;
    website: string | null;
  };
  membership: {
    accountPlan: string;
    accountPlanStatus: string;
    id: string;
    monthlyTokenLimit: number;
    roleCode: string | null;
    roleName: string | null;
    status: "active" | "invited" | "suspended";
  };
  notifications: {
    browserNotifications: boolean;
    dailyDigest: boolean;
    emailReminders: boolean;
    inAppReminders: boolean;
    reminderLeadTime: number;
  };
  tokenUsage: {
    periodEnd: string;
    periodStart: string;
    remainingTokens: number;
    usedTokens: number;
  };
  permissions: {
    canImportSae: boolean;
    canManageMembership: boolean;
    canManageStudio: boolean;
  };
};

export type SaePreviewItem = {
  action: "create" | "update";
  caption: string;
  caseNumber: string;
  court: string | null;
  externalId: string;
  jurisdictionText: string | null;
  provinceText: string | null;
  suggestedStatus: "open" | "paused" | "closed";
  unitText: string | null;
  warnings: string[];
};

export type SaePreviewResponse = {
  expiresAt: string;
  importSessionId: string;
  items: SaePreviewItem[];
  summary: {
    createCount: number;
    total: number;
    updateCount: number;
    warningCount: number;
  };
};

export type SaeImportResponse = {
  importedCount: number;
  items: Array<{
    caseId: string | null;
    caseNumber: string;
    externalId: string;
    message: string | null;
    status: "imported" | "updated" | "skipped";
  }>;
  skippedCount: number;
  updatedCount: number;
};
