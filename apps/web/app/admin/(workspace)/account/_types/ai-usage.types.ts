export type AccountAiUsageResponse = {
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
  membership: {
    accountPlan: string;
    accountPlanStatus: string;
    id: string;
    monthlyTokenLimit: number;
    roleCode: string | null;
    roleName: string | null;
    status: "active" | "invited" | "suspended";
  };
  tokenUsage: {
    periodEnd: string;
    periodStart: string;
    remainingTokens: number;
    usedTokens: number;
  };
  historyPeriodStart: string;
  historyPeriodEnd: string;
  metrics: {
    currentStreak: number;
    longestStreak: number;
    maxDailyTokens: number;
    totalTokens: number;
  };
  dailyUsage: AccountAiUsageDay[];
};

export type AccountAiUsageDay = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
