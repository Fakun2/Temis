import type { StaffListResponseDto, StaffWorkerDto } from "@temis/api-client";

export type StaffListResponse = StaffListResponseDto;

export type StaffWorker = StaffWorkerDto;

export type StaffStatus = StaffWorkerDto["status"];

export type StaffSortKey = "firstName" | "lastName" | "role" | "status";

export type StaffSortDirection = "asc" | "desc";

export type StaffFilters = {
  firstName: string;
  lastName: string;
  practiceAreaId: string;
  role: string;
  status: string;
};

export type StaffQueryParams = {
  cursor: string | null;
  filters: StaffFilters;
  limit: number;
  sortDirection: StaffSortDirection;
  sortKey: StaffSortKey;
};
