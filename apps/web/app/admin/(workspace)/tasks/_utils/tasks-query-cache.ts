import type { QueryKey } from "@tanstack/react-query";
import { caseKeys } from "../../cases/_api/cases.api";

export function isTasksQuery(query: { queryKey: QueryKey }) {
  return query.queryKey[1] === caseKeys.all[0] && query.queryKey[2] === "tasks";
}

export function isTenantTaskListQuery(query: { queryKey: QueryKey }) {
  return isTasksQuery(query) && typeof query.queryKey[3] === "object";
}

export function isTenantTaskMetricsQuery(query: { queryKey: QueryKey }) {
  return isTasksQuery(query) && query.queryKey[3] === "metrics";
}

export function isTenantTasksDataQuery(query: { queryKey: QueryKey }) {
  return isTenantTaskListQuery(query) || isTenantTaskMetricsQuery(query);
}
