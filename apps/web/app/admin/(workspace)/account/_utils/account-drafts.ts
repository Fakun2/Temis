import type {
  AccountMembershipFormValues,
  AccountNotificationsFormValues,
  AccountProfileFormValues,
  AccountStudioFormValues
} from "@/lib/validation/account";
import type { AccountResponse } from "../_types/account.types";

export function toProfileDraft(account: AccountResponse): AccountProfileFormValues {
  return {
    avatarUrl: account.profile.avatarUrl ?? "",
    firstName: account.profile.firstName,
    lastName: account.profile.lastName,
    phone: account.profile.phone ?? ""
  };
}

export function toStudioDraft(account: AccountResponse): AccountStudioFormValues {
  return {
    address: account.studio.address ?? "",
    city: account.studio.city,
    country: account.studio.country,
    legalName: account.studio.legalName ?? "",
    logoUrl: account.studio.logoUrl ?? "",
    name: account.studio.name,
    province: account.studio.province,
    taxId: account.studio.taxId ?? "",
    website: account.studio.website ?? ""
  };
}

export function toMembershipDraft(account: AccountResponse): AccountMembershipFormValues {
  return {
    accountPlan: account.membership.accountPlan,
    accountPlanStatus: account.membership.accountPlanStatus,
    monthlyTokenLimit: account.membership.monthlyTokenLimit
  };
}

export function toNotificationsDraft(account: AccountResponse): AccountNotificationsFormValues {
  return {
    browserNotifications: account.notifications.browserNotifications,
    dailyDigest: account.notifications.dailyDigest,
    emailReminders: account.notifications.emailReminders,
    inAppReminders: account.notifications.inAppReminders,
    reminderLeadTime: account.notifications.reminderLeadTime
  };
}
