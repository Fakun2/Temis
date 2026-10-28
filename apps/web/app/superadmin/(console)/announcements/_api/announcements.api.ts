import type {
  PlatformAnnouncementDetailDto,
  PlatformAnnouncementListItemDto,
  PlatformAnnouncementListItemDtoAudience,
  PlatformAnnouncementListItemDtoCategory,
  PlatformAnnouncementListItemDtoLifecycle,
  PlatformAnnouncementListItemDtoSeverity,
  PlatformAnnouncementListItemDtoStatus,
  PlatformAnnouncementsListDto,
  PlatformAnnouncementsSummaryDto,
  PlatformAnnouncementTenantOptionDto,
  PlatformAnnouncementTenantOptionsListDto
} from "@temis/api-client";
import { dashboardHttpClient } from "@/lib/http";

export type AnnouncementCategory = PlatformAnnouncementListItemDtoCategory;
export type AnnouncementSeverity = PlatformAnnouncementListItemDtoSeverity;
export type AnnouncementAudience = PlatformAnnouncementListItemDtoAudience;
export type AnnouncementStatus = PlatformAnnouncementListItemDtoStatus;
export type AnnouncementLifecycle = PlatformAnnouncementListItemDtoLifecycle;
export type AnnouncementDeliveryMode = "draft" | "publish_now" | "schedule";

export type PlatformAnnouncement = PlatformAnnouncementListItemDto;
export type PlatformAnnouncementDetail = PlatformAnnouncementDetailDto;

export type PlatformAnnouncementsQuery = {
  activity?: "active" | "inactive";
  audience?: AnnouncementAudience;
  category?: AnnouncementCategory;
  cursor?: string;
  limit?: number;
  search?: string;
  severity?: AnnouncementSeverity;
  status?: AnnouncementStatus;
};

export type PlatformAnnouncementsList = PlatformAnnouncementsListDto;
export type PlatformAnnouncementsSummary = PlatformAnnouncementsSummaryDto;

export type AnnouncementInput = {
  audience: AnnouncementAudience;
  body: string;
  category: AnnouncementCategory;
  endsAt?: string;
  linkLabel?: string;
  linkUrl?: string;
  severity: AnnouncementSeverity;
  startsAt?: string;
  targetTenantIds?: string[];
  title: string;
};

export type TenantOption = PlatformAnnouncementTenantOptionDto;
export type TenantOptionsList = PlatformAnnouncementTenantOptionsListDto;

export function createAnnouncement(
  input: AnnouncementInput & { deliveryMode: AnnouncementDeliveryMode }
) {
  return dashboardHttpClient.request<PlatformAnnouncement>({
    body: input,
    method: "POST",
    path: "/superadmin/announcements"
  });
}
export function updateAnnouncement(id: string, input: AnnouncementInput) {
  return dashboardHttpClient.request<PlatformAnnouncement>({
    body: input,
    method: "PATCH",
    path: `/superadmin/announcements/${id}`
  });
}
export function getAnnouncement(id: string) {
  return dashboardHttpClient.request<PlatformAnnouncementDetail>({
    path: `/superadmin/announcements/${id}`
  });
}
export function announcementAction(id: string, action: "publish" | "schedule" | "cancel") {
  return dashboardHttpClient.request<PlatformAnnouncement>({
    method: "POST",
    path: `/superadmin/announcements/${id}/${action}`
  });
}
export function listTenantOptions(params: { cursor?: string; limit?: number; search?: string }) {
  return dashboardHttpClient.request<TenantOptionsList>({
    params,
    path: "/superadmin/announcements/tenant-options"
  });
}
